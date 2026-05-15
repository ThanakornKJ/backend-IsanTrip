const mongoose = require("mongoose");

// ================= FESTIVAL IMAGE =================
const festivalImageSchema = new mongoose.Schema(
  {
    imageURL: {
      type: String,
      required: true,
      trim: true,
    },

    isCover: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// ================= FESTIVAL LOCATION =================
const festivalLocationSchema = new mongoose.Schema(
  {
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TouristPlace",
      required: true,
    },

    eventDate: {
      type: Date,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// ================= FESTIVAL =================
const festivalSchema = new mongoose.Schema(
  {
    festivalName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // FK → จังหวัด
    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: true,
    },

    festivalImages: [festivalImageSchema],

    festivalLocations: [festivalLocationSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Festival", festivalSchema);