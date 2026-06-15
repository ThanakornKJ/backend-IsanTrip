const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { Resend } = require("resend");
const Otp = require("../models/Otp");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

const googleClient = new OAuth2Client(
  process.env.GOOGLE_WEB_CLIENT_ID
);

// =====================================================
// ================= CONSTANTS =========================
// =====================================================

const REFRESH_EXPIRE_MS =
  7 * 24 * 60 * 60 * 1000;

const OTP_EXPIRE_MS =
  5 * 60 * 1000;

const OTP_MAX_ATTEMPTS = 5;

// =====================================================
// ================= HELPERS ===========================
// =====================================================

const buildUserResponse = (user) => {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage || "",
    userType: user.userType,

    // GOOGLE LOGIN
    googleId: user.googleId || "",
    authProvider: user.authProvider || "local",

    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const normalizeEmail = (email = "") => {
  return email.trim().toLowerCase();
};

const createAndStoreTokens = async (user) => {
  const accessToken =
    generateAccessToken(user);

  const refreshToken =
    generateRefreshToken(user);

  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(
      Date.now() + REFRESH_EXPIRE_MS
    ),
  });

  return {
    accessToken,
    refreshToken,
  };
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return "Password ต้องมีอย่างน้อย 6 ตัวอักษร";
  }

  return null;
};

const createOtpCode = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const sendOtpEmail = async ({
  email,
  otp,
  subject = "รหัส OTP สำหรับสมัครสมาชิก Isan Trip",
  heading = "ยืนยันอีเมลสำหรับสมัครสมาชิก Isan Trip",
}) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is missing"
    );
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error(
      "RESEND_FROM_EMAIL is missing"
    );
  }

  const { data, error } =
    await resend.emails.send({
      from: `Isan Trip <${fromEmail}>`,
      to: email,
      subject,
      text: `รหัส OTP ของคุณคือ ${otp} รหัสนี้หมดอายุภายใน 5 นาที`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>${heading}</h2>
          <p>รหัส OTP ของคุณคือ</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>รหัสนี้หมดอายุภายใน 5 นาที</p>
          <p>หากคุณไม่ได้เป็นผู้ขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลนี้</p>
        </div>
      `,
    });

  if (error) {
    throw new Error(
      error.message || JSON.stringify(error)
    );
  }

  return data;
};

// =====================================================
// ================= REGISTER SEND OTP =================
// =====================================================

router.post(
  "/register/send-otp",
  async (req, res) => {
    try {
      let { email } = req.body || {};

      email = normalizeEmail(email);

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกอีเมล",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "รูปแบบอีเมลไม่ถูกต้อง",
        });
      }

      const userExists =
        await User.findOne({
          email,
        });

      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "อีเมลนี้ถูกใช้งานแล้ว",
        });
      }

      await Otp.deleteMany({
        email,
        purpose: "register",
        used: false,
      });

      const otp = createOtpCode();

      await Otp.create({
        email,
        otp,
        purpose: "register",
        expiresAt: new Date(
          Date.now() + OTP_EXPIRE_MS
        ),
      });

      await sendOtpEmail({
        email,
        otp,
      });

      return res.json({
        success: true,
        message: "ส่งรหัส OTP ไปยังอีเมลแล้ว",
      });
    } catch (err) {
      console.error(
        "REGISTER SEND OTP ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "ส่ง OTP ไม่สำเร็จ",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= REGISTER ==========================
// =====================================================

router.post(
  "/register",
  async (req, res) => {
    try {
      let {
        fullName,
        email,
        password,
        otp,
      } = req.body || {};

      fullName = fullName?.trim();
      email = normalizeEmail(email);
      otp = otp?.trim();

      if (
        !fullName ||
        !email ||
        !password ||
        !otp
      ) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลให้ครบ",
        });
      }

      const passwordError =
        validatePassword(password);

      if (passwordError) {
        return res.status(400).json({
          success: false,
          message: passwordError,
        });
      }

      if (otp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: "รหัส OTP ไม่ถูกต้อง",
        });
      }

      const userExists =
        await User.findOne({
          email,
        });

      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "อีเมลนี้ถูกใช้งานแล้ว",
        });
      }

      const otpRecord =
        await Otp.findOne({
          email,
          purpose: "register",
          used: false,
        }).sort({
          createdAt: -1,
        });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: "กรุณาขอรหัส OTP ก่อนสมัครสมาชิก",
        });
      }

      if (otpRecord.expiresAt < new Date()) {
        await otpRecord.deleteOne();

        return res.status(400).json({
          success: false,
          message: "รหัส OTP หมดอายุแล้ว กรุณาขอใหม่",
        });
      }

      if (
        otpRecord.attempts >=
        OTP_MAX_ATTEMPTS
      ) {
        return res.status(400).json({
          success: false,
          message: "กรอกรหัส OTP ผิดเกินจำนวนที่กำหนด กรุณาขอใหม่",
        });
      }

      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        return res.status(400).json({
          success: false,
          message: "รหัส OTP ไม่ถูกต้อง",
        });
      }

      otpRecord.used = true;
      await otpRecord.save();

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({
          fullName,
          email,
          password: hashedPassword,
          authProvider: "local",
          userType: "user",
        });

      const tokens =
        await createAndStoreTokens(
          user
        );

      return res.status(201).json({
        success: true,
        message: "สมัครสมาชิกสำเร็จ",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: buildUserResponse(user),
      });
    } catch (err) {
      console.error(
        "REGISTER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ============ FORGOT PASSWORD SEND OTP ===============
// =====================================================

router.post(
  "/forgot-password/send-otp",
  async (req, res) => {
    try {
      let { email } = req.body || {};

      email = normalizeEmail(email);

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกอีเมล",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "รูปแบบอีเมลไม่ถูกต้อง",
        });
      }

      const user =
        await User.findOne({
          email,
        }).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบอีเมลนี้ในระบบ",
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: "บัญชีนี้เข้าสู่ระบบด้วย Google ไม่สามารถรีเซ็ตรหัสผ่านได้",
        });
      }

      await Otp.deleteMany({
        email,
        purpose: "forgot_password",
        used: false,
      });

      const otp = createOtpCode();

      await Otp.create({
        email,
        otp,
        purpose: "forgot_password",
        expiresAt: new Date(
          Date.now() + OTP_EXPIRE_MS
        ),
      });

      await sendOtpEmail({
        email,
        otp,
        subject: "รหัส OTP สำหรับรีเซ็ตรหัสผ่าน Isan Trip",
        heading: "ยืนยันการรีเซ็ตรหัสผ่าน Isan Trip",
      });

      return res.json({
        success: true,
        message: "ส่งรหัส OTP ไปยังอีเมลแล้ว",
      });
    } catch (err) {
      console.error(
        "FORGOT PASSWORD SEND OTP ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "ส่ง OTP ไม่สำเร็จ",
        error: err.message,
      });
    }
  }
);

// =====================================================
// =============== RESET FORGOT PASSWORD ===============
// =====================================================

router.post(
  "/forgot-password/reset",
  async (req, res) => {
    try {
      let {
        email,
        otp,
        password,
      } = req.body || {};

      email = normalizeEmail(email);
      otp = otp?.toString().trim() || "";

      if (
        !email ||
        !otp ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลให้ครบ",
        });
      }

      const passwordError =
        validatePassword(password);

      if (passwordError) {
        return res.status(400).json({
          success: false,
          message: passwordError,
        });
      }

      if (otp.length !== 6) {
        return res.status(400).json({
          success: false,
          message: "รหัส OTP ไม่ถูกต้อง",
        });
      }

      const user =
        await User.findOne({
          email,
        }).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบอีเมลนี้ในระบบ",
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: "บัญชีนี้เข้าสู่ระบบด้วย Google ไม่สามารถรีเซ็ตรหัสผ่านได้",
        });
      }

      const otpRecord =
        await Otp.findOne({
          email,
          purpose: "forgot_password",
          used: false,
        }).sort({
          createdAt: -1,
        });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: "กรุณาขอรหัส OTP ก่อนรีเซ็ตรหัสผ่าน",
        });
      }

      if (otpRecord.expiresAt < new Date()) {
        await otpRecord.deleteOne();

        return res.status(400).json({
          success: false,
          message: "รหัส OTP หมดอายุแล้ว กรุณาขอใหม่",
        });
      }

      if (
        otpRecord.attempts >=
        OTP_MAX_ATTEMPTS
      ) {
        return res.status(400).json({
          success: false,
          message: "กรอกรหัส OTP ผิดเกินจำนวนที่กำหนด กรุณาขอใหม่",
        });
      }

      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        return res.status(400).json({
          success: false,
          message: "รหัส OTP ไม่ถูกต้อง",
        });
      }

      otpRecord.used = true;
      await otpRecord.save();

      user.password =
        await bcrypt.hash(
          password,
          10
        );

      if (!user.authProvider) {
        user.authProvider = "local";
      }

      await user.save();

      await RefreshToken.deleteMany({
        userId: user._id,
      });

      return res.json({
        success: true,
        message: "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง",
      });
    } catch (err) {
      console.error(
        "RESET PASSWORD ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= LOGIN =============================
// =====================================================

router.post(
  "/login",
  async (req, res) => {
    try {
      let {
        email,
        password,
      } = req.body || {};

      email = normalizeEmail(email);

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message: "Email และ Password จำเป็นต้องกรอก",
        });
      }

      const user =
        await User.findOne({
          email,
        }).select("+password");

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid email",
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: "บัญชีนี้เข้าสู่ระบบด้วย Google",
        });
      }

      const isMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid password",
        });
      }

      const tokens =
        await createAndStoreTokens(
          user
        );

      return res.json({
        success: true,
        message: "Login success",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: buildUserResponse(user),
      });
    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= GOOGLE LOGIN ======================
// =====================================================

router.post(
  "/google",
  async (req, res) => {
    try {
      const { idToken } = req.body || {};

      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "idToken is required",
        });
      }

      if (
        !process.env.GOOGLE_WEB_CLIENT_ID
      ) {
        return res.status(500).json({
          success: false,
          message: "GOOGLE_WEB_CLIENT_ID is missing",
        });
      }

      const ticket =
        await googleClient.verifyIdToken({
          idToken,
          audience:
            process.env.GOOGLE_WEB_CLIENT_ID,
        });

      const payload =
        ticket.getPayload();

      const googleId =
        payload?.sub;

      const email =
        normalizeEmail(
          payload?.email || ""
        );

      const emailVerified =
        payload?.email_verified;

      const fullName =
        payload?.name?.trim() ||
        email.split("@")[0] ||
        "Google User";

      const profileImage =
        payload?.picture || "";

      if (!googleId || !email) {
        return res.status(401).json({
          success: false,
          message: "Invalid Google account data",
        });
      }

      if (!emailVerified) {
        return res.status(401).json({
          success: false,
          message: "Google email is not verified",
        });
      }

      // =====================================
      // FIND USER
      // 1) หา user จาก googleId ก่อน
      // 2) ถ้าไม่เจอ หา account เดิมจาก email
      // 3) ถ้าไม่เจอ สร้าง user ใหม่
      // =====================================

      let user =
        await User.findOne({
          googleId,
        });

      if (!user) {
        user =
          await User.findOne({
            email,
          });
      }

      if (!user) {
        user =
          await User.create({
            googleId,
            fullName,
            email,
            profileImage,
            authProvider: "google",
            userType: "user",
          });
      } else {
        let needSave = false;

        if (!user.googleId) {
          user.googleId = googleId;
          needSave = true;
        }

        if (!user.fullName && fullName) {
          user.fullName = fullName;
          needSave = true;
        }

        if (
          profileImage &&
          !user.profileImage
        ) {
          user.profileImage =
            profileImage;
          needSave = true;
        }

        if (!user.authProvider) {
          user.authProvider =
            user.password
              ? "local"
              : "google";
          needSave = true;
        }

        if (
          !user.password &&
          user.authProvider !== "google"
        ) {
          user.authProvider = "google";
          needSave = true;
        }

        if (needSave) {
          await user.save();
        }
      }

      const tokens =
        await createAndStoreTokens(
          user
        );

      return res.json({
        success: true,
        message: "Google login success",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: buildUserResponse(user),
      });
    } catch (err) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        err
      );

      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= CURRENT USER ======================
// =====================================================

router.get(
  "/me",
  protect,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json(
        buildUserResponse(user)
      );
    } catch (err) {
      console.error(
        "ME ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ============== UPDATE EMAIL SEND OTP ================
// =====================================================

router.post(
  "/update-email/send-otp",
  protect,
  async (req, res) => {
    try {
      let { email } = req.body || {};

      email = normalizeEmail(email);

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกอีเมลใหม่",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "รูปแบบอีเมลไม่ถูกต้อง",
        });
      }

      const currentUser =
        await User.findById(
          req.user._id
        );

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (email === currentUser.email) {
        return res.status(400).json({
          success: false,
          message: "อีเมลนี้เป็นอีเมลเดิมของคุณ",
        });
      }

      const emailExists =
        await User.findOne({
          email,
          _id: {
            $ne: currentUser._id,
          },
        });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "อีเมลนี้ถูกใช้งานแล้ว",
        });
      }

      await Otp.deleteMany({
        email,
        purpose: "update_email",
        used: false,
      });

      const otp = createOtpCode();

      await Otp.create({
        email,
        otp,
        purpose: "update_email",
        expiresAt: new Date(
          Date.now() + OTP_EXPIRE_MS
        ),
      });

      await sendOtpEmail({
        email,
        otp,
        subject: "รหัส OTP สำหรับเปลี่ยนอีเมล Isan Trip",
        heading: "ยืนยันอีเมลใหม่สำหรับ Isan Trip",
      });

      return res.json({
        success: true,
        message: "ส่งรหัส OTP ไปยังอีเมลใหม่แล้ว",
      });
    } catch (err) {
      console.error(
        "UPDATE EMAIL SEND OTP ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "ส่ง OTP ไม่สำเร็จ",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= UPDATE PROFILE ====================
// =====================================================

router.put(
  "/update",
  protect,
  async (req, res) => {
    try {
      const {
        fullName,
        email,
        password,
        profileImage,
        otp,
      } = req.body || {};

      const user =
        await User.findById(
          req.user._id
        ).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ================= EMAIL =================

      if (email !== undefined) {
        const normalizedEmail =
          normalizeEmail(email);

        if (
          normalizedEmail &&
          normalizedEmail !== user.email
        ) {
          const exists =
            await User.findOne({
              email: normalizedEmail,
              _id: {
                $ne: user._id,
              },
            });

          if (exists) {
            return res.status(400).json({
              success: false,
              message: "อีเมลนี้ถูกใช้งานแล้ว",
            });
          }

          const cleanOtp =
            otp?.toString().trim() || "";

          if (cleanOtp.length !== 6) {
            return res.status(400).json({
              success: false,
              message: "กรุณากรอกรหัส OTP สำหรับเปลี่ยนอีเมล",
            });
          }

          const otpRecord =
            await Otp.findOne({
              email: normalizedEmail,
              purpose: "update_email",
              used: false,
            }).sort({
              createdAt: -1,
            });

          if (!otpRecord) {
            return res.status(400).json({
              success: false,
              message: "กรุณาขอรหัส OTP ก่อนเปลี่ยนอีเมล",
            });
          }

          if (otpRecord.expiresAt < new Date()) {
            await otpRecord.deleteOne();

            return res.status(400).json({
              success: false,
              message: "รหัส OTP หมดอายุแล้ว กรุณาขอใหม่",
            });
          }

          if (
            otpRecord.attempts >=
            OTP_MAX_ATTEMPTS
          ) {
            return res.status(400).json({
              success: false,
              message: "กรอกรหัส OTP ผิดเกินจำนวนที่กำหนด กรุณาขอใหม่",
            });
          }

          if (otpRecord.otp !== cleanOtp) {
            otpRecord.attempts += 1;
            await otpRecord.save();

            return res.status(400).json({
              success: false,
              message: "รหัส OTP ไม่ถูกต้อง",
            });
          }

          otpRecord.used = true;
          await otpRecord.save();

          user.email = normalizedEmail;
        }
      }

      // ================= FULL NAME =================

      if (fullName !== undefined) {
        const cleanFullName =
          fullName.toString().trim();

        if (!cleanFullName) {
          return res.status(400).json({
            success: false,
            message: "กรุณากรอกชื่อ",
          });
        }

        user.fullName = cleanFullName;
      }

      // ================= PROFILE IMAGE =================

      if (profileImage !== undefined) {
        user.profileImage = profileImage;
      }

      // ================= PASSWORD =================

      if (password) {
        const passwordError =
          validatePassword(password);

        if (passwordError) {
          return res.status(400).json({
            success: false,
            message: passwordError,
          });
        }

        user.password =
          await bcrypt.hash(
            password,
            10
          );

        if (!user.authProvider) {
          user.authProvider = "local";
        }
      }

      await user.save();

      return res.json({
        success: true,
        message: "อัปเดตข้อมูลสำเร็จ",
        user: buildUserResponse(user),
      });
    } catch (err) {
      console.error(
        "UPDATE PROFILE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= REFRESH TOKEN =====================
// =====================================================

router.post(
  "/refresh",
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "No token",
        });
      }

      const storedToken =
        await RefreshToken.findOne({
          token: refreshToken,
        });

      if (!storedToken) {
        return res.status(403).json({
          success: false,
          message: "Invalid token",
        });
      }

      if (
        storedToken.expiresAt <
        new Date()
      ) {
        await storedToken.deleteOne();

        return res.status(403).json({
          success: false,
          message: "Expired token",
        });
      }

      const decoded =
        jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );

      const user =
        await User.findById(
          decoded.id
        );

      if (!user) {
        await storedToken.deleteOne();

        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const newAccessToken =
        generateAccessToken(user);

      return res.json({
        success: true,
        accessToken: newAccessToken,
      });
    } catch (err) {
      console.error(
        "REFRESH TOKEN ERROR:",
        err
      );

      return res.status(403).json({
        success: false,
        message: "Expired token",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= LOGOUT ============================
// =====================================================

router.post(
  "/logout",
  protect,
  async (req, res) => {
    try {
      await RefreshToken.deleteMany({
        userId: req.user._id,
      });

      return res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      console.error(
        "LOGOUT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

// =====================================================
// ================= ADMIN DELETE USER =================
// =====================================================

router.delete(
  "/delete-user/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      if (
        req.user._id.toString() ===
        req.params.id
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete yourself",
        });
      }

      const user =
        await User.findByIdAndDelete(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await RefreshToken.deleteMany({
        userId: req.params.id,
      });

      return res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE USER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  }
);

module.exports = router;