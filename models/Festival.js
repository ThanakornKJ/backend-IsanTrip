const mongoose = require("mongoose");

const festivalImageSchema = new mongoose.Schema({
  imageURL: String,
  isCover:  { type: Boolean, default: false },
});

const festivalLocationSchema = new mongoose.Schema({
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TouristPlace",
  },
  eventDate:   Date,
  description: String,
});

const festivalSchema = new mongoose.Schema(
  {
    festivalName: { type: String, required: true, trim: true },
    description:  String,
    startDate:    Date,
    endDate:      Date,

    // 🔄 เปลี่ยนจาก String → ref Province
    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
    },

    festivalImages:    [festivalImageSchema],
    festivalLocations: [festivalLocationSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Festival", festivalSchema);