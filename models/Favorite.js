const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TouristPlace",
      required: true,
    },
  },
  { timestamps: true }
);

// กัน favorite ซ้ำ
favoriteSchema.index({ userId: 1, placeId: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);