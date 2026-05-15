const mongoose =
  require(
    "mongoose"
  );

const favoriteSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose
            .Schema
            .Types
            .ObjectId,
        ref: "User",
        required:
          true,
      },

      placeId: {
        type:
          mongoose
            .Schema
            .Types
            .ObjectId,
        ref:
          "TouristPlace",
        required:
          true,
      },
    },
    {
      timestamps:
        true,
      versionKey:
        false,
    }
  );

// ==========================
// PREVENT DUPLICATE
// ==========================
favoriteSchema.index(
  {
    userId: 1,
    placeId: 1,
  },
  {
    unique: true,
  }
);

favoriteSchema.index({
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "Favorite",
    favoriteSchema
  );