const mongoose = require("mongoose");

const festivalImageSchema = new mongoose.Schema({
  imageURL: String,
  isCover: Boolean
});

const festivalLocationSchema = new mongoose.Schema({
  placeId: { type: mongoose.Schema.Types.ObjectId, ref: "TouristPlace" },
  eventDate: Date,
  description: String
});

const festivalSchema = new mongoose.Schema({
  festivalName: String,
  description: String,
  startDate: Date,
  endDate: Date,
  province: String,
  festivalImages: [festivalImageSchema],
  festivalLocations: [festivalLocationSchema]
});

module.exports = mongoose.model("Festival", festivalSchema);