const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================
// CREATE UPLOAD FOLDER
// ==========================
function createFolder(
  folderPath
) {
  if (
    !fs.existsSync(
      folderPath
    )
  ) {
    fs.mkdirSync(
      folderPath,
      {
        recursive: true,
      }
    );
  }
}

// ==========================
// FILE FILTER
// ==========================
function fileFilter(
  req,
  file,
  cb
) {
  const allowedTypes =
    /jpg|jpeg|png|webp/;

  const extname =
    allowedTypes.test(
      path
        .extname(
          file.originalname
        )
        .toLowerCase()
    );

  const mimetype =
    allowedTypes.test(
      file.mimetype
    );

  if (
    extname &&
    mimetype
  ) {
    return cb(
      null,
      true
    );
  }

  cb(
    new Error(
      "Only image files are allowed"
    )
  );
}

// ==========================
// CREATE MULTER
// ==========================
function createUploader(
  folder
) {
  createFolder(folder);

  const storage =
    multer.diskStorage(
      {
        destination:
          (
            req,
            file,
            cb
          ) => {
            cb(
              null,
              folder
            );
          },

        filename:
          (
            req,
            file,
            cb
          ) => {
            const uniqueName =
              `${Date.now()}-${Math.round(
                Math.random() *
                  1e9
              )}${path.extname(
                file.originalname
              )}`;

            cb(
              null,
              uniqueName
            );
          },
      }
    );

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize:
        5 *
        1024 *
        1024, // 5MB
    },
  });
}

// ==========================
// EXPORT UPLOADERS
// ==========================
const uploadPlaces =
  createUploader(
    "uploads/places"
  );

const uploadTrips =
  createUploader(
    "uploads/trips"
  );

const uploadFestivals =
  createUploader(
    "uploads/festivals"
  );

const uploadReviews =
  createUploader(
    "uploads/reviews"
  );

module.exports = {
  uploadPlaces,
  uploadTrips,
  uploadFestivals,
  uploadReviews,
};