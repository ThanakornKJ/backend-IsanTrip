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
// ================= REGISTER ==========================
// =====================================================
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "กรุณากรอกข้อมูลให้ครบ",
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      userType: "user",
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
    });

    res.status(201).json({
      message: "Register success",
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= LOGIN =============================
// =====================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email และ Password จำเป็นต้องกรอก",
      });
    }

    const user =
    await User.findOne({
      email,
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Invalid email",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "บัญชีนี้เข้าสู่ระบบด้วย Facebook",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= FACEBOOK WEB ======================
// =====================================================
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
  })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
  }),
  async (req, res) => {
    try {
      const accessToken = generateAccessToken(
        req.user
      );

      const refreshToken =
        generateRefreshToken(req.user);

      await RefreshToken.create({
        user: req.user._id,
        token: refreshToken,
      });

      res.json({
        accessToken,
        refreshToken,
        user: {
          _id: req.user._id,
          fullName: req.user.fullName,
          email: req.user.email,
          profileImage:
            req.user.profileImage,
          userType: req.user.userType,
        },
      });
    } catch (err) {
      console.error(
        "FACEBOOK CALLBACK ERROR:",
        err
      );

      res.status(500).json({
        message: "Facebook login failed",
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
          message: "Access token required",
        });
      }

      const fbResponse = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
      );

      const fbData = await fbResponse.json();

      if (fbData.error) {
        return res.status(400).json({
          message:
            "Invalid Facebook token",
        });
      }

      let user = await User.findOne({
        facebookId: fbData.id,
      });

      if (!user) {
        user = await User.create({
          facebookId: fbData.id,
          fullName: fbData.name,
          email: fbData.email,
          profileImage:
            fbData.picture?.data?.url,
          userType: "user",
        });
      }

      const access =
        generateAccessToken(user);

      const refresh =
        generateRefreshToken(user);

      await RefreshToken.create({
        user: user._id,
        token: refresh,
      });

      res.json({
        accessToken: access,
        refreshToken: refresh,
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profileImage:
            user.profileImage,
          userType: user.userType,
        },
      });
    } catch (err) {
      console.error(
        "FACEBOOK MOBILE ERROR:",
        err
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= CURRENT USER ======================
// =====================================================
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(
      req.user._id
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (err) {
    console.error("ME ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= UPDATE PROFILE ====================
// =====================================================
router.put("/update", protect, async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      profileImage,
    } = req.body;

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // check email duplicate
    if (
      email &&
      email !== user.email
    ) {
      const emailExists =
        await User.findOne({ email });

      if (emailExists) {
        return res.status(400).json({
          message:
            "Email already exists",
        });
      }

      user.email = email;
    }

    if (fullName) {
      user.fullName = fullName;
    }

    if (profileImage) {
      user.profileImage =
        profileImage;
    }

    if (password) {
      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      user.password =
        hashedPassword;
    }

    await user.save();

    res.json({
      message:
        "Profile updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImage:
          user.profileImage,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.error(
      "UPDATE PROFILE ERROR:",
      err
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= REFRESH TOKEN =====================
// =====================================================
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: "No token",
      });
    }

    const storedToken =
      await RefreshToken.findOne({
        token: refreshToken,
      });

    if (!storedToken) {
      return res.status(403).json({
        message: "Invalid token",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(
      decoded.id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const newAccessToken =
      generateAccessToken(user);

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
      message: "Expired token",
    });
  }
});

// =====================================================
// ================= ADMIN DELETE USER =================
// =====================================================
router.delete(
  "/delete-user/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const user =
        await User.findByIdAndDelete(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

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
        message: "Server error",
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
        user: req.user._id,
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
        message: "Server error",
      });
    }
  }
);

module.exports = router;