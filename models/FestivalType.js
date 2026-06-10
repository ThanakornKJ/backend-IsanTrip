const mongoose =
  require(
    "mongoose"
  );

const festivalTypeSchema =
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
    "FestivalType",
    festivalTypeSchema
  );