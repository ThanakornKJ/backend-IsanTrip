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

  return cb(
    new Error("รองรับเฉพาะไฟล์รูปภาพ jpg, jpeg, png, webp เท่านั้น")
  );
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
          quality: "auto:good",
          fetch_format: "auto",
          width: 1600,
          crop: "limit",
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
      // Cloudinary plan ปัจจุบันรับสูงสุด 10MB
      // ตั้งไว้ 9MB เพื่อกัน error จาก Cloudinary
      fileSize: 9 * 1024 * 1024,
      files: 10,
    },
  });
}

// ==========================
// MULTER ERROR HANDLER
// ใช้ครอบ route ที่ upload รูป เพื่อส่ง error กลับไป frontend ให้อ่านง่าย
// ==========================
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "ไฟล์รูปภาพมีขนาดใหญ่เกินไป กรุณาเลือกรูปไม่เกิน 9MB ต่อรูป",
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "เลือกรูปภาพได้ไม่เกิน 10 รูปต่อครั้ง",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "อัปโหลดรูปภาพไม่สำเร็จ",
    });
  }

  if (err) {
    const message = err.message || "";

    if (
      message.includes("File size too large") ||
      message.includes("Maximum is 10485760")
    ) {
      return res.status(400).json({
        success: false,
        message: "ไฟล์รูปภาพใหญ่เกิน 10MB ซึ่งเกินขีดจำกัดของ Cloudinary กรุณาเลือกรูปที่เล็กลง",
      });
    }

    return res.status(400).json({
      success: false,
      message: message || "อัปโหลดรูปภาพไม่สำเร็จ",
    });
  }

  next();
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
  handleUploadError,
};