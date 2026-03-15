const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
  facebookId: { type: String, unique: true, sparse: true },
  profileImage: String,
  userType: { 
    type: String, 
    enum: ["admin", "user"],
    default: "user"   // ✅ เพิ่ม default
  },
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TouristPlace"
    }
  ],

  registerDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);