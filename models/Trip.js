const mongoose = require("mongoose");

// รายการสถานที่ในทริป
const tripPlaceSchema = new mongoose.Schema({
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TouristPlace",
    required: true,
  },
  sequenceNo: {
    type: Number,
    required: true,
  },
  visitDate: Date,
});

// 🆕 รายการเทศกาลในทริป (TripFestival)
const tripFestivalSchema = new mongoose.Schema({
  festivalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Festival",
    required: true,
  },
  attendDate: Date,
});

// 🔄 Trip Image ที่มี isCover (เดิมเก็บเป็น String[])
const tripImageSchema = new mongoose.Schema({
  imageURL: { type: String, required: true },
  isCover:  { type: Boolean, default: false },
});

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tripName: {
      type: String,
      required: true,
      trim: true,
    },

    startDate:     { type: Date, required: true },
    endDate:       { type: Date, required: true },
    startLocation: String,
    description:   String,

    isPublic: {
      type: Boolean,
      default: false,
    },

    // 🔄 เปลี่ยนจาก images: [String] → tripImages: [tripImageSchema]
    tripImages: [tripImageSchema],

    tripPlaces:    [tripPlaceSchema],

    // 🆕 เพิ่ม tripFestivals
    tripFestivals: [tripFestivalSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);