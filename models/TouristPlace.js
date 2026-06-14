const mongoose = require("mongoose");

// ================= PLACE IMAGE =================
const placeImageSchema = new mongoose.Schema(
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

    provinceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Province",
      required: false,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },

    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlaceType",
      required: false,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

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
    categoryOrder: {
      type: Number,
      default: 0,
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

touristPlaceSchema.index({
  location: "2dsphere",
});

touristPlaceSchema.index(
  {
    placeName: 1,
  },
  {
    unique: true,
  }
);

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

module.exports = mongoose.model("TouristPlace", touristPlaceSchema);