const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Polymorphic — ชี้ไปได้ทั้ง TouristPlace และ Festival
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },

    targetType: {
      type: String,
      required: true,
      enum: ["TouristPlace", "Festival"],
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index เพื่อกัน review ซ้ำ (1 user ต่อ 1 target)
reviewSchema.index(
  { userId: 1, targetId: 1, targetType: 1 },
  { unique: true }
);

module.exports = mongoose.model("Review", reviewSchema);