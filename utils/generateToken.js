const jwt = require("jsonwebtoken");

// =====================================================
// ================= ACCESS TOKEN ======================
// =====================================================
const generateAccessToken = (
  user
) => {
  if (!user || !user._id) {
    throw new Error(
      "Invalid user for access token"
    );
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      userType:
        user.userType || "user",
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "15m",
    }
  );
};

// =====================================================
// ================= REFRESH TOKEN =====================
// =====================================================
const generateRefreshToken = (
  user
) => {
  if (!user || !user._id) {
    throw new Error(
      "Invalid user for refresh token"
    );
  }

  return jwt.sign(
    {
      id: user._id.toString(),
    },

    process.env
      .JWT_REFRESH_SECRET,

    {
      expiresIn: "7d",
    }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};