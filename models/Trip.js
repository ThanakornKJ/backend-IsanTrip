const mongoose = require("mongoose");

// =====================================================
// ================= TRIP IMAGE =========================
// =====================================================
const tripImageSchema = new mongoose.Schema(
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

// =====================================================
// ================= TRIP PLACE =========================
// =====================================================
const tripPlaceSchema = new mongoose.Schema(
  {
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TouristPlace",
      required: true,
    },

    sequenceNo: {
      type: Number,
      required: true,
      min: 1,
    },

    visitDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// =====================================================
// ================= TRIP FESTIVAL ======================
// =====================================================
const tripFestivalSchema = new mongoose.Schema(
  {
    festivalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Festival",
      required: true,
    },

    attendDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// =====================================================
// ================= TRIP ===============================
// =====================================================
const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tripName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    startLocation: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },

    tripImages: {
      type: [tripImageSchema],
      default: [],
    },

    tripPlaces: {
      type: [tripPlaceSchema],
      default: [],
    },

    tripFestivals: {
      type: [tripFestivalSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.index({
  isPublic: 1,
  createdAt: -1,
});

tripSchema.index({
  userId: 1,
  createdAt: -1,
});

tripSchema.pre("save", function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error("endDate ต้องมากกว่า startDate"));
  }

  next();
});

module.exports = mongoose.model("Trip", tripSchema);