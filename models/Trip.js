const mongoose = require("mongoose");

const tripPlaceSchema = new mongoose.Schema({
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TouristPlace",
    required: true
  },
  visitDate: {
    type: Date
  },
  sequenceNo: {
    type: Number,
    required: true
  }
});

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    tripName: {
      type: String,
      required: true,
      trim: true
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    startLocation: {
      type: String
    },

    description: {
      type: String
    },

    images: [
      {
        type: String
      }
    ],

    isPublic: {
      type: Boolean,
      default: false
    },

    tripPlaces: [tripPlaceSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Trip", tripSchema);