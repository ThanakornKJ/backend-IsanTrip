require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");

const TouristPlace = require("./models/TouristPlace");

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Atlas connected"))
.catch(err=>console.log(err));

const results = [];

fs.createReadStream("places_mongodb_atlas_ready.csv")
  .pipe(csv())
  .on("data", (data) => {

    const place = {
      placeName: data.placeName,
      description: data.description,
      address: data.address,
      province: data.province,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),

      openingHours: data.openingHours,
      category: data.category,

      touristType: data.touristType
        ? data.touristType
            .split(",")
            .map(t => t.trim())
            .filter(t => t.length > 0)
        : [],

      contact: data.contact,
      entranceFee: data.entranceFee,
      socialMedia: data.socialMedia,

      highlight: data.highlight,
      travelInfo: data.travelInfo,

      placeImages: data.imageURL
        ? [{ imageURL: data.imageURL, isCover: true }]
        : []
    };

    results.push(place);
  })
  .on("end", async () => {
    try {
      await TouristPlace.deleteMany();
      await TouristPlace.insertMany(results);

      console.log("Seed success:", results.length);

      mongoose.connection.close();
    } catch (err) {
      console.error(err);
    }
  });