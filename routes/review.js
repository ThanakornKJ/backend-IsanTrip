const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");

const Review = require("../models/Review");
const ReviewImage = require("../models/ReviewImage");
const TouristPlace = require("../models/TouristPlace");
const Festival = require("../models/Festival");

const protect = require("../middleware/authMiddleware");

// =====================================================
// ================= UPLOAD CONFIG =====================
// =====================================================

const uploadDir = path.join(
  __dirname,
  "../uploads/reviews"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (
    allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    return cb(null, true);
  }

  cb(
    new Error(
      "Only jpg, jpeg, png, webp are allowed"
    )
  );
};

const uploadReviews = multer({
  storage,

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },

  fileFilter,
});

// =====================================================
// ================= VALIDATE TARGET ===================
// =====================================================

const validateTarget = async (
  targetId,
  targetType
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      targetId
    )
  ) {
    return false;
  }

  if (
    targetType ===
    "TouristPlace"
  ) {
    const exists =
      await TouristPlace.exists({
        _id: targetId,
      });

    return !!exists;
  }

  if (
    targetType ===
    "Festival"
  ) {
    const exists =
      await Festival.exists({
        _id: targetId,
      });

    return !!exists;
  }

  return false;
};

// =====================================================
// ================= FORMAT REVIEW =====================
// =====================================================

const formatReview = (
  review,
  images = []
) => {
  return {
    _id: review._id,

    user: review.userId
      ? {
          _id:
            review.userId._id,

          fullName:
            review.userId
              .fullName,

          email:
            review.userId
              .email,

          profileImage:
            review.userId
              .profileImage,
        }
      : null,

    targetId:
      review.targetId,

    targetType:
      review.targetType,

    rating:
      review.rating,

    comment:
      review.comment,

    images,

    createdAt:
      review.createdAt,

    updatedAt:
      review.updatedAt,
  };
};

// =====================================================
// ================= CREATE REVIEW =====================
// =====================================================

router.post(
  "/",
  protect,
  uploadReviews.array(
    "images",
    5
  ),

  async (req, res) => {
    try {
      const {
        targetId,
        targetType,
        rating,
        comment,
      } = req.body;

      // ==========================================
      // VALIDATE TARGET TYPE
      // ==========================================

      if (
        ![
          "TouristPlace",
          "Festival",
        ].includes(
          targetType
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid targetType",
          });
      }

      // ==========================================
      // VALIDATE TARGET
      // ==========================================

      const targetExists =
        await validateTarget(
          targetId,
          targetType
        );

      if (
        !targetExists
      ) {
        return res
          .status(404)
          .json({
            message:
              "Target not found",
          });
      }

      // ==========================================
      // VALIDATE RATING
      // ==========================================

      const parsedRating =
        Number(rating);

      if (
        Number.isNaN(
          parsedRating
        ) ||
        parsedRating < 1 ||
        parsedRating > 5
      ) {
        return res
          .status(400)
          .json({
            message:
              "Rating must be between 1-5",
          });
      }

      // ==========================================
      // CREATE REVIEW
      // ==========================================

      const review =
        await Review.create({
          userId:
            req.user._id,

          targetId,

          targetType,

          rating:
            parsedRating,

          comment:
            comment || "",
        });

      // ==========================================
      // SAVE IMAGES
      // ==========================================

      let imageUrls =
        [];

      if (
        req.files?.length >
        0
      ) {
        const images =
          req.files.map(
            (
              file
            ) => ({
              reviewId:
                review._id,

              imageURL:
                `/uploads/reviews/${file.filename}`,
            })
          );

        await ReviewImage.insertMany(
          images
        );

        imageUrls =
          images.map(
            (
              img
            ) =>
              img.imageURL
          );
      }

      // ==========================================
      // RESPONSE
      // ==========================================

      const populatedReview =
        await Review.findById(
          review._id
        )
          .populate(
            "userId",
            "fullName profileImage email"
          )
          .lean();

      res
        .status(201)
        .json({
          message:
            "Review created successfully",

          review:
            formatReview(
              populatedReview,
              imageUrls
            ),
        });
    } catch (err) {
      // ==========================================
      // DUPLICATE REVIEW
      // ==========================================

      if (
        err.code ===
        11000
      ) {
        return res
          .status(400)
          .json({
            message:
              "You already reviewed this item",
          });
      }

      console.error(
        "CREATE REVIEW ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Create review failed",
        });
    }
  }
);

// =====================================================
// ============ GET REVIEWS BY TARGET ==================
// =====================================================

router.get(
  "/:targetType/:targetId",
  async (req, res) => {
    try {
      const {
        targetType,
        targetId,
      } = req.params;

      // ==========================================
      // VALIDATE TYPE
      // ==========================================

      if (
        ![
          "TouristPlace",
          "Festival",
        ].includes(
          targetType
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid targetType",
          });
      }

      // ==========================================
      // VALIDATE OBJECT ID
      // ==========================================

      if (
        !mongoose.Types.ObjectId.isValid(
          targetId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid targetId",
          });
      }

      // ==========================================
      // FIND REVIEWS
      // ==========================================

      const reviews =
        await Review.find({
          targetId,
          targetType,
        })
          .populate(
            "userId",
            "fullName profileImage email"
          )
          .sort({
            createdAt:
              -1,
          })
          .lean();

      const reviewIds =
        reviews.map(
          (
            review
          ) =>
            review._id
        );

      // ==========================================
      // REVIEW IMAGES
      // ==========================================

      const images =
        await ReviewImage.find(
          {
            reviewId:
              {
                $in:
                  reviewIds,
              },
          }
        ).lean();

      const imageMap =
        images.reduce(
          (
            acc,
            image
          ) => {
            const key =
              image.reviewId.toString();

            if (
              !acc[
                key
              ]
            ) {
              acc[
                key
              ] = [];
            }

            acc[
              key
            ].push(
              image.imageURL
            );

            return acc;
          },
          {}
        );

      // ==========================================
      // FORMAT RESPONSE
      // ==========================================

      const formattedReviews =
        reviews.map(
          (
            review
          ) =>
            formatReview(
              review,
              imageMap[
                review._id.toString()
              ] ||
                []
            )
        );

      // ==========================================
      // REVIEW SUMMARY
      // ==========================================

      const totalReviews =
        formattedReviews.length;

      const averageRating =
        totalReviews > 0
          ? Number(
              (
                formattedReviews.reduce(
                  (
                    sum,
                    item
                  ) =>
                    sum +
                    item.rating,
                  0
                ) /
                totalReviews
              ).toFixed(
                1
              )
            )
          : 0;

      res.json({
        totalReviews,
        averageRating,
        reviews:
          formattedReviews,
      });
    } catch (err) {
      console.error(
        "GET REVIEWS ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Load reviews failed",
        });
    }
  }
);

// =====================================================
// ================= UPDATE REVIEW =====================
// =====================================================

router.put(
  "/:id",
  protect,
  uploadReviews.array(
    "images",
    5
  ),

  async (req, res) => {
    try {
      const {
        rating,
        comment,
      } = req.body;

      // ==========================================
      // FIND REVIEW
      // ==========================================

      const review =
        await Review.findOne(
          {
            _id:
              req.params.id,

            userId:
              req.user._id,
          }
        );

      if (!review) {
        return res
          .status(404)
          .json({
            message:
              "Review not found",
          });
      }

      // ==========================================
      // UPDATE RATING
      // ==========================================

      if (
        rating !==
        undefined
      ) {
        const parsedRating =
          Number(
            rating
          );

        if (
          Number.isNaN(
            parsedRating
          ) ||
          parsedRating <
            1 ||
          parsedRating >
            5
        ) {
          return res
            .status(400)
            .json({
              message:
                "Rating must be between 1-5",
            });
        }

        review.rating =
          parsedRating;
      }

      // ==========================================
      // UPDATE COMMENT
      // ==========================================

      if (
        comment !==
        undefined
      ) {
        review.comment =
          comment;
      }

      await review.save();

      // ==========================================
      // REPLACE IMAGES
      // ==========================================

      if (
        req.files?.length >
        0
      ) {
        // ลบ image records เดิม
        await ReviewImage.deleteMany(
          {
            reviewId:
              review._id,
          }
        );

        // เพิ่มใหม่
        const newImages =
          req.files.map(
            (
              file
            ) => ({
              reviewId:
                review._id,

              imageURL:
                `/uploads/reviews/${file.filename}`,
            })
          );

        await ReviewImage.insertMany(
          newImages
        );
      }

      // ==========================================
      // GET UPDATED
      // ==========================================

      const updatedReview =
        await Review.findById(
          review._id
        )
          .populate(
            "userId",
            "fullName profileImage email"
          )
          .lean();

      const reviewImages =
        await ReviewImage.find(
          {
            reviewId:
              review._id,
          }
        ).lean();

      res.json({
        message:
          "Review updated successfully",

        review:
          formatReview(
            updatedReview,
            reviewImages.map(
              (
                img
              ) =>
                img.imageURL
            )
          ),
      });
    } catch (err) {
      console.error(
        "UPDATE REVIEW ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Update review failed",
        });
    }
  }
);

// =====================================================
// ================= DELETE REVIEW =====================
// =====================================================

router.delete(
  "/:id",
  protect,

  async (req, res) => {
    try {
      const review =
        await Review.findOne(
          {
            _id:
              req.params.id,

            userId:
              req.user._id,
          }
        );

      if (!review) {
        return res
          .status(404)
          .json({
            message:
              "Review not found",
          });
      }

      // ==========================================
      // DELETE REVIEW IMAGES
      // ==========================================

      const reviewImages =
        await ReviewImage.find(
          {
            reviewId:
              review._id,
          }
        );

      // ลบไฟล์จริง
      for (const image of reviewImages) {
        const filePath =
          path.join(
            __dirname,
            "..",
            image.imageURL
          );

        if (
          fs.existsSync(
            filePath
          )
        ) {
          fs.unlinkSync(
            filePath
          );
        }
      }

      await ReviewImage.deleteMany(
        {
          reviewId:
            review._id,
        }
      );

      // ==========================================
      // DELETE REVIEW
      // ==========================================

      await review.deleteOne();

      res.json({
        message:
          "Review deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE REVIEW ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Delete review failed",
        });
    }
  }
);

module.exports = router;