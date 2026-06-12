const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // =====================================
    // USER
    // =====================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =====================================
    // TARGET ID
    // TouristPlace / Trip
    // =====================================
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
      index: true,
    },

    // =====================================
    // TARGET TYPE
    // =====================================
    targetType: {
      type: String,
      required: true,
      enum: ["TouristPlace", "Trip"],
    },

    // =====================================
    // RATING 1-5
    // =====================================
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // =====================================
    // COMMENT
    // =====================================
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// =====================================
// UNIQUE REVIEW
// 1 USER / 1 TARGET
// =====================================
reviewSchema.index(
  {
    userId: 1,
    targetId: 1,
    targetType: 1,
  },
  {
    unique: true,
  }
);

// =====================================
// SORT PERFORMANCE
// =====================================
reviewSchema.index({
  targetType: 1,
  targetId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Review", reviewSchema);