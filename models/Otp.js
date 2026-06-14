const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    otp: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["register", "forgot_password", "update_email"],
      default: "register",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },

    used: {
      type: Boolean,
      default: false,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

otpSchema.index({
  email: 1,
  purpose: 1,
  used: 1,
});

module.exports = mongoose.model("Otp", otpSchema);