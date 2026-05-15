const mongoose = require("mongoose");

// ================= PLACE IMAGE =================
const placeImageSchema = new mongoose.Schema(
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

// ================= TOURIST PLACE =================
const touristPlaceSchema = new mongoose.Schema(
  {
    placeName: {
      type: String,
      required: [true, "placeName is required"],
      trim: true,
      maxlength: 255,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    // ================= PROVINCE =================
    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: false,
    },

    // ================= CATEGORY =================
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },

    // ================= PLACE TYPE =================
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlaceType",
      required: false,
    },

    // ================= GEO LOCATION =================
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0], // [longitude, latitude]
      },
    },

    // เก็บไว้ compatibility กับ frontend เดิม
    latitude: {
      type: Number,
      default: 0,
    },

    longitude: {
      type: Number,
      default: 0,
    },

    openingHours: {
      type: String,
      trim: true,
      default: "",
    },

    contact: {
      type: String,
      trim: true,
      default: "",
    },

    entranceFee: {
      type: String,
      trim: true,
      default: "",
    },

    socialMedia: {
      type: String,
      trim: true,
      default: "",
    },

    highlight: {
      type: String,
      trim: true,
      default: "",
    },

    travelInfo: {
      type: String,
      trim: true,
      default: "",
    },

    placeImages: {
      type: [placeImageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ================= GEO INDEX =================
touristPlaceSchema.index({
  location: "2dsphere",
});

// ================= AUTO SET LOCATION =================
touristPlaceSchema.pre("save", function (next) {
  if (
    typeof this.latitude === "number" &&
    typeof this.longitude === "number"
  ) {
    this.location = {
      type: "Point",
      coordinates: [this.longitude, this.latitude],
    };
  }

  next();
});

// ================= EXPORT =================
module.exports = mongoose.model(
  "TouristPlace",
  touristPlaceSchema
);