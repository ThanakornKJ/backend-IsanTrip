const mongoose =
  require(
    "mongoose"
  );

const provinceSchema =
  new mongoose.Schema(
    {
      name: {
        type:
          String,
        required:
          true,
        unique:
          true,
        trim: true,
        minlength:
          2,
        maxlength:
          100,
      },
    },
    {
      timestamps:
        true,
      versionKey:
        false,
    }
  );

module.exports =
  mongoose.model(
    "Province",
    provinceSchema
  );