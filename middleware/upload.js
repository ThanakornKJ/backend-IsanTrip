const multer = require("multer");
const path = require("path");
const fs = require("fs");

function createUploader(folder) {

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, folder);
    },

    filename: function (req, file, cb) {
      const unique =
        Date.now() + "-" + Math.round(Math.random() * 1e9);

      cb(null, unique + path.extname(file.originalname));
    }
  });

  return multer({ storage });
}

const uploadPlaces = createUploader("uploads/places");
const uploadTrips = createUploader("uploads/trips");
const uploadFestivals = createUploader("uploads/festivals");

module.exports = {
  uploadPlaces,
  uploadTrips,
  uploadFestivals
};