const mongoose =
  require(
    "mongoose"
  );

const provinceSchema =
  new mongoose.Schema(
    {
      provinceName:
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

// provinceSchema.index(
//   {
//     provinceName:
//       1,
//   }
// );

module.exports =
  mongoose.model(
    "Province",
    provinceSchema
  );