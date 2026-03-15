const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  token: String,
  createdAt: { type: Date, default: Date.now, expires: "7d" }
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);