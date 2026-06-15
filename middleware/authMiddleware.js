const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (
  req,
  res,
  next
) => {
  try {
    let token;

    // =====================================
    // GET TOKEN FROM HEADER
    // Authorization: Bearer xxxxx
    // =====================================
    const authHeader =
      req.headers.authorization;

    if (
      authHeader &&
      authHeader.startsWith(
        "Bearer "
      )
    ) {
      token =
        authHeader.split(
          " "
        )[1];
    }

    // =====================================
    // NO TOKEN
    // =====================================
    if (!token) {
      return res.status(401).json({
        message:
          "Unauthorized: No token",
      });
    }

    // =====================================
    // VERIFY JWT
    // =====================================
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    // =====================================
    // FIND USER
    // =====================================
    const user =
      await User.findById(
        decoded.id
      ).select("-password");

    if (!user) {
      return res.status(401).json({
        message:
          "Unauthorized: User not found",
      });
    }

    // =====================================
    // ATTACH USER TO REQUEST
    // =====================================
    req.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      userType: user.userType,
      googleId: user.googleId,
      authProvider: user.authProvider,
    };

    next();
  } catch (error) {
    console.error(
      "AUTH ERROR:",
      error
    );

    // JWT EXPIRED
    if (
      error.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        message:
          "Token expired",
      });
    }

    // JWT INVALID
    if (
      error.name ===
      "JsonWebTokenError"
    ) {
      return res.status(401).json({
        message:
          "Invalid token",
      });
    }

    return res.status(401).json({
      message:
        "Unauthorized",
    });
  }
};

module.exports = protect;