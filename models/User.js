const mongoose = require("mongoose");

const userSchema =
  new mongoose.Schema(
    {
      // =====================================
      // FULL NAME
      // =====================================
      fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      // =====================================
      // EMAIL
      // =====================================
      email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true,
      },

      // =====================================
      // PASSWORD
      // null ได้สำหรับ Google login
      // =====================================
      password: {
        type: String,
        select: false,
      },

      // =====================================
      // GOOGLE LOGIN
      // =====================================
      googleId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
      },

      // =====================================
      // AUTH PROVIDER
      // =====================================
      authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local",
      },

      // =====================================
      // PROFILE IMAGE
      // =====================================
      profileImage: {
        type: String,
        default: "",
      },

      // =====================================
      // USER TYPE
      // =====================================
      userType: {
        type: String,
        enum: ["admin", "user"],
        default: "user",
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

userSchema.index({
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "User",
    userSchema
  );