const mongoose =
  require(
    "mongoose"
  );

const categorySchema =
  new mongoose.Schema(
    {
      categoryName:
        {
          type:
            String,
          required:
            true,
          unique:
            true,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
    },
    {
      timestamps:
        true,
      versionKey:
        false,
    }
  );

// categorySchema.index(
//   {
//     categoryName:
//       1,
//   }
// );

module.exports =
  mongoose.model(
    "Category",
    categorySchema
  );