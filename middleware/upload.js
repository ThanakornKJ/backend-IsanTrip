const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ==========================
// CLOUDINARY CONFIG
// ==========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================
// FILE FILTER
// ==========================
function fileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error("Only jpg, jpeg, png, webp image files are allowed"));
}

// ==========================
// CREATE CLOUDINARY STORAGE
// ==========================
function createCloudinaryStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        {
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    },
  });
}

// ==========================
// CREATE UPLOADER
// ==========================
function createUploader(folder) {
  return multer({
    storage: createCloudinaryStorage(folder),
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
}

// ==========================
// HELPERS
// ==========================
function getCloudinaryImageUrl(file) {
  return file?.path || file?.secure_url || "";
}

function getCloudinaryPublicId(file) {
  return file?.filename || file?.public_id || "";
}

// ==========================
// EXPORT UPLOADERS
// ==========================
const uploadPlaces = createUploader("isan-trip/places");
const uploadTrips = createUploader("isan-trip/trips");
const uploadFestivals = createUploader("isan-trip/festivals");
const uploadReviews = createUploader("isan-trip/reviews");

module.exports = {
  cloudinary,
  uploadPlaces,
  uploadTrips,
  uploadFestivals,
  uploadReviews,
  getCloudinaryImageUrl,
  getCloudinaryPublicId,
};