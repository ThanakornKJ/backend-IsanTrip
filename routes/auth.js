const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // ✅ เพิ่ม
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const passport = require("passport");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const router = express.Router();


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword
    });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await RefreshToken.create({ user: user._id, token: refreshToken });
    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await RefreshToken.create({ user: user._id, token: refreshToken });

    res.json({ accessToken, refreshToken });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= FACEBOOK WEB =================
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  async (req, res) => {
    const accessToken = generateAccessToken(req.user);
    const refreshToken = generateRefreshToken(req.user);

    await RefreshToken.create({ user: req.user._id, token: refreshToken });

    res.json({ accessToken, refreshToken });
  }
);


// ================= FACEBOOK MOBILE =================
router.post("/facebook-mobile", async (req, res) => {
  try {
    const { accessToken } = req.body;

    const fbResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    const fbData = await fbResponse.json();

    if (fbData.error) {
      return res.status(400).json({ message: "Invalid Facebook token" });
    }

    let user = await User.findOne({ facebookId: fbData.id });

    if (!user) {
      user = await User.create({
        facebookId: fbData.id,
        fullName: fbData.name,
        email: fbData.email,
        profileImage: fbData.picture?.data?.url
      });
    }

    const access = generateAccessToken(user);
    const refresh = generateRefreshToken(user);

    await RefreshToken.create({ user: user._id, token: refresh });

    res.json({ accessToken: access, refreshToken: refresh });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= CURRENT USER =================
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= UPDATE PROFILE =================
router.put("/update", protect, async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = email;
    }
    if (fullName) {
      user.fullName = fullName;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }
    await user.save();
    res.json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= REFRESH =================
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken)
      return res.status(401).json({ message: "No token" });

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken)
      return res.status(403).json({ message: "Invalid token" });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded.id);

    const newAccessToken = generateAccessToken(user);

    res.json({ accessToken: newAccessToken });

  } catch {
    res.status(403).json({ message: "Expired token" });
  }
});


// ================= ADMIN DELETE USER =================
router.delete(
  "/delete-user/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  }
);

router.post("/logout", protect, async (req, res) => {
  await RefreshToken.deleteMany({ user: req.user._id });
  res.json({ message: "Logged out" });
});

module.exports = router;