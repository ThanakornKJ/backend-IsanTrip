const mongoose =
  require("mongoose");

const reviewImageSchema =
  new mongoose.Schema(
    {
      // =====================================
      // REVIEW ID
      // =====================================
      reviewId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Review",
        required: true,
        index: true,
      },

      // =====================================
      // IMAGE URL
      // =====================================
      imageURL: {
        type: String,
        required: true,
        trim: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

// =====================================
// INDEX FOR PERFORMANCE
// =====================================

// reviewImageSchema.index({
//   reviewId: 1,
// });

module.exports =
  mongoose.model(
    "ReviewImage",
    reviewImageSchema
  );