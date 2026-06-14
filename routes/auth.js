const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");

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


// =====================================================
// ================= CONSTANTS =========================
// =====================================================

const REFRESH_EXPIRE_MS =
  7 * 24 * 60 * 60 * 1000;
const OTP_EXPIRE_MS = 5 * 60 * 1000;
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
    facebookId: user.facebookId || "",
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
const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async ({
  email,
  otp,
  subject = "รหัส OTP สำหรับสมัครสมาชิก Isan Trip",
  heading = "ยืนยันอีเมลสำหรับสมัครสมาชิก Isan Trip",
}) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing");
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is missing");
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

      // ================= VALIDATION =================

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

      // ================= CHECK EMAIL =================

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

      // ================= CHECK OTP =================

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

      if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
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

      // ================= HASH PASSWORD =================

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      // ================= CREATE USER =================

      const user =
        await User.create({
          fullName,
          email,
          password: hashedPassword,
          userType: "user",
        });

      // ================= TOKEN =================

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

      email =
        normalizeEmail(email);

      // ================= VALIDATION =================

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Email และ Password จำเป็นต้องกรอก",
        });
      }

      // ================= FIND USER =================

      const user =
        await User.findOne({
          email,
        }).select("+password");

      if (!user) {
        return res.status(400).json({
          message:
            "Invalid email",
        });
      }

      // ================= FACEBOOK LOGIN =================

      if (!user.password) {
        return res.status(400).json({
          message:
            "บัญชีนี้เข้าสู่ระบบด้วย Facebook",
        });
      }

      // ================= CHECK PASSWORD =================

      const isMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!isMatch) {
        return res.status(400).json({
          message:
            "Invalid password",
        });
      }

      // ================= TOKEN =================

      const tokens =
        await createAndStoreTokens(
          user
        );

      res.json({
        accessToken:
          tokens.accessToken,

        refreshToken:
          tokens.refreshToken,

        user:
          buildUserResponse(
            user
          ),
      });

    } catch (err) {

      console.error(
        "LOGIN ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);


// =====================================================
// ================= FACEBOOK MOBILE ===================
// =====================================================

router.post(
  "/facebook-mobile",
  async (req, res) => {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message: "Access token required",
        });
      }

      // ================= VERIFY FACEBOOK TOKEN =================
      // ตอนนี้เปิด permission email แล้ว
      // แต่ Facebook บางบัญชีอาจยังไม่ส่ง email กลับมา
      // ดังนั้นยังต้องมี fallback email เสมอ

      const fbResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
      );

      const fbData = await fbResponse.json();

      if (!fbResponse.ok || fbData.error || !fbData.id) {
        return res.status(400).json({
          success: false,
          message: "Invalid Facebook token",
          error: fbData.error?.message,
        });
      }

      const facebookId = fbData.id;

      const facebookEmail = normalizeEmail(
        fbData.email || ""
      );

      const fallbackEmail = normalizeEmail(
        `facebook_${facebookId}@facebook.local`
      );

      const email =
        facebookEmail || fallbackEmail;

      const fullName =
        fbData.name?.trim() || "Facebook User";

      const profileImage =
        fbData.picture?.data?.url || "";

      const isFallbackEmail = (value = "") => {
        return value.includes("@facebook.local");
      };

      // ================= FIND USER =================
      // หา user จาก facebookId ก่อน
      // ถ้าไม่มีค่อยหา email จริง
      // ถ้ายังไม่มีค่อยหา fallback email สำหรับ user เก่าที่เคย login ก่อนเปิด email permission

      let user = await User.findOne({
        facebookId,
      });

      if (!user && facebookEmail) {
        user = await User.findOne({
          email: facebookEmail,
        });
      }

      if (!user) {
        user = await User.findOne({
          email: fallbackEmail,
        });
      }

      // ================= CREATE USER =================

      if (!user) {
        user = await User.create({
          facebookId,
          fullName,
          email,
          profileImage,
          userType: "user",
        });
      } else {
        let needSave = false;

        // sync facebook id
        if (!user.facebookId) {
          user.facebookId = facebookId;
          needSave = true;
        }

        // sync name
        if (!user.fullName && fullName) {
          user.fullName = fullName;
          needSave = true;
        }

        // sync image
        if (!user.profileImage && profileImage) {
          user.profileImage = profileImage;
          needSave = true;
        }

        // ถ้า user เดิมเคยถูกสร้างด้วย fallback email
        // แล้วตอนนี้ Facebook ส่ง email จริงมา ให้เปลี่ยนเป็น email จริง
        if (
          facebookEmail &&
          isFallbackEmail(user.email)
        ) {
          const emailOwner = await User.findOne({
            email: facebookEmail,
            _id: {
              $ne: user._id,
            },
          });

          if (!emailOwner) {
            user.email = facebookEmail;
            needSave = true;
          }
        }

        if (needSave) {
          await user.save();
        }
      }

      // ================= TOKEN =================

      const tokens =
        await createAndStoreTokens(user);

      return res.json({
        success: true,
        message: "Facebook login success",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: buildUserResponse(user),
      });
    } catch (err) {
      console.error(
        "FACEBOOK MOBILE ERROR:",
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
          message:
            "User not found",
        });
      }

      res.json(
        buildUserResponse(user)
      );

    } catch (err) {

      console.error(
        "ME ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
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
        await User.findById(req.user._id);

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

          if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
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

      // ================= FULLNAME =================

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

      const {
        refreshToken,
      } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          message:
            "No token",
        });
      }

      // ================= CHECK TOKEN =================

      const storedToken =
        await RefreshToken.findOne({
          token:
            refreshToken,
        });

      if (!storedToken) {
        return res.status(403).json({
          message:
            "Invalid token",
        });
      }

      // ================= CHECK EXPIRE =================

      if (
        storedToken.expiresAt <
        new Date()
      ) {

        await storedToken.deleteOne();

        return res.status(403).json({
          message:
            "Expired token",
        });
      }

      // ================= VERIFY JWT =================

      const decoded =
        jwt.verify(
          refreshToken,
          process.env
            .JWT_REFRESH_SECRET
        );

      const user =
        await User.findById(
          decoded.id
        );

      if (!user) {

        await storedToken.deleteOne();

        return res.status(404).json({
          message:
            "User not found",
        });
      }

      // ================= GENERATE ACCESS TOKEN =================

      const newAccessToken =
        generateAccessToken(
          user
        );

      res.json({
        accessToken:
          newAccessToken,
      });

    } catch (err) {

      console.error(
        "REFRESH TOKEN ERROR:",
        err
      );

      res.status(403).json({
        message:
          "Expired token",
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
        userId:
          req.user._id,
      });

      res.json({
        message:
          "Logged out successfully",
      });

    } catch (err) {

      console.error(
        "LOGOUT ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
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

      // admin ห้ามลบตัวเอง
      if (
        req.user._id.toString() ===
        req.params.id
      ) {
        return res.status(400).json({
          message:
            "Cannot delete yourself",
        });
      }

      const user =
        await User.findByIdAndDelete(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      // delete refresh tokens
      await RefreshToken.deleteMany({
        userId:
          req.params.id,
      });

      res.json({
        message:
          "User deleted successfully",
      });

    } catch (err) {

      console.error(
        "DELETE USER ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

module.exports = router;