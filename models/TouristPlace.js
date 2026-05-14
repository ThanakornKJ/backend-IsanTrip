const mongoose = require("mongoose");

const placeImageSchema = new mongoose.Schema({
  imageURL: String,
  isCover: { type: Boolean, default: false },
});

const touristPlaceSchema = new mongoose.Schema(
  {
    placeName: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,
    address:     String,

    // 🔄 เปลี่ยนจาก String → ref Province
    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
    },

    latitude:  Number,
    longitude: Number,

    openingHours: {
      type: String,
      trim: true,
    },

    // 🔄 เปลี่ยนจาก String → ref Category
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    // 🔄 เปลี่ยนจาก [String] → ref PlaceType
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlaceType",
    },

    contact:     String,
    entranceFee: String,
    socialMedia: String,
    highlight:   String,
    travelInfo:  String,

    placeImages: [placeImageSchema],
  },
  { timestamps: true }
);

touristPlaceSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("TouristPlace", touristPlaceSchema);