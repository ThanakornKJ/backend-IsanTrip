const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

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
      } = req.body;

      fullName = fullName?.trim();
      email = normalizeEmail(email);

      // ================= VALIDATION =================

      if (
        !fullName ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "กรุณากรอกข้อมูลให้ครบ",
        });
      }

      const passwordError =
        validatePassword(password);

      if (passwordError) {
        return res.status(400).json({
          message: passwordError,
        });
      }

      // ================= CHECK EMAIL =================

      const userExists =
        await User.findOne({
          email,
        });

      if (userExists) {
        return res.status(400).json({
          message:
            "Email already exists",
        });
      }

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
          password:
            hashedPassword,
          userType: "user",
        });

      // ================= TOKEN =================

      const tokens =
        await createAndStoreTokens(
          user
        );

      res.status(201).json({
        message:
          "Register success",

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
        "REGISTER ERROR:",
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
// ================= LOGIN =============================
// =====================================================

router.post(
  "/login",
  async (req, res) => {
    try {

      let {
        email,
        password,
      } = req.body;

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

      const {
        accessToken,
      } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          message:
            "Access token required",
        });
      }

      // ================= VERIFY FACEBOOK TOKEN =================

      const fbResponse =
        await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
        );

      const fbData =
        await fbResponse.json();

      if (
        !fbResponse.ok ||
        fbData.error
      ) {
        return res.status(400).json({
          message:
            "Invalid Facebook token",
        });
      }

      const email =
        normalizeEmail(
          fbData.email || ""
        );

      // ================= FIND USER =================

      let user =
        await User.findOne({
          $or: [
            {
              facebookId:
                fbData.id,
            },

            ...(email
              ? [{ email }]
              : []),
          ],
        });

      // ================= CREATE USER =================

      if (!user) {

        user =
          await User.create({
            facebookId:
              fbData.id,

            fullName:
              fbData.name,

            email,

            profileImage:
              fbData.picture?.data
                ?.url || "",

            userType:
              "user",
          });

      } else {

        // sync facebook id
        if (!user.facebookId) {
          user.facebookId =
            fbData.id;
        }

        // sync image
        if (
          !user.profileImage &&
          fbData.picture?.data?.url
        ) {
          user.profileImage =
            fbData.picture.data.url;
        }

        await user.save();
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
        "FACEBOOK MOBILE ERROR:",
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
      } = req.body;

      const user =
        await User.findById(
          req.user._id
        ).select("+password");

      if (!user) {
        return res.status(404).json({
          message:
            "User not found",
        });
      }

      // ================= EMAIL =================

      if (
        email !== undefined &&
        email !== user.email
      ) {

        const normalizedEmail =
          normalizeEmail(email);

        const exists =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne: user._id,
            },
          });

        if (exists) {
          return res.status(400).json({
            message:
              "Email already exists",
          });
        }

        user.email =
          normalizedEmail;
      }

      // ================= FULLNAME =================

      if (
        fullName !== undefined
      ) {
        user.fullName =
          fullName.trim();
      }

      // ================= PROFILE IMAGE =================

      if (
        profileImage !== undefined
      ) {
        user.profileImage =
          profileImage;
      }

      // ================= PASSWORD =================

      if (password) {

        const passwordError =
          validatePassword(
            password
          );

        if (passwordError) {
          return res.status(400).json({
            message:
              passwordError,
          });
        }

        user.password =
          await bcrypt.hash(
            password,
            10
          );
      }

      await user.save();

      res.json({
        message:
          "Profile updated successfully",

        user:
          buildUserResponse(
            user
          ),
      });

    } catch (err) {

      console.error(
        "UPDATE PROFILE ERROR:",
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