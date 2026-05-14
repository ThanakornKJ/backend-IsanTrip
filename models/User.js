const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName:   String,
    email:      { type: String, unique: true, sparse: true },
    password:   String,
    facebookId: { type: String, unique: true, sparse: true },
    profileImage: String,

    userType: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },

    // 🗑️ ลบ favorites[] ออก → ย้ายไป Favorite model แล้ว
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);