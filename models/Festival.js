const mongoose = require("mongoose");

// ================= FESTIVAL IMAGE =================
const festivalImageSchema = new mongoose.Schema(
  {
    imageURL: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      trim: true,
      default: "",
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
    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: true,
    },

    locationName: {
      type: String,
      trim: true,
      default: "",
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    eventDate: {
      type: Date,
    },

    description: {
      type: String,
      trim: true,
      default: "",
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
      default: "",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    festivalTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FestivalType",
      required: true,
    },

    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },

    festivalImages: {
      type: [festivalImageSchema],
      default: [],
    },

    festivalLocations: {
      type: [festivalLocationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Festival", festivalSchema);