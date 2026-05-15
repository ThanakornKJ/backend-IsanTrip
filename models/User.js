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
      // null ได้สำหรับ Facebook login
      // =====================================
      password: {
        type: String,
        select: false,
      },

      // =====================================
      // FACEBOOK LOGIN
      // =====================================
      facebookId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
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
        enum: [
          "admin",
          "user",
        ],
        default: "user",
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// =====================================
// INDEXES
// =====================================
// userSchema.index({
//   email: 1,
// });

userSchema.index({
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "User",
    userSchema
  );