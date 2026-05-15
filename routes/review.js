const express = require("express");
const router = express.Router();

const Review = require("../models/Review");
const ReviewImage = require("../models/ReviewImage");

const protect = require("../middleware/authMiddleware");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =====================================================
// ================= UPLOAD CONFIG =====================
// =====================================================

const uploadDir = "uploads/reviews";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName + path.extname(file.originalname)
    );
  },
});

const uploadReviews = multer({ storage });


// =====================================================
// ================= CREATE REVIEW =====================
// =====================================================

router.post(
  "/",
  protect,
  uploadReviews.array("images", 5),
  async (req, res) => {
    try {
      const {
        targetId,
        targetType,
        rating,
        comment,
      } = req.body;

      // validate target type
      if (
        !["TouristPlace", "Festival"].includes(
          targetType
        )
      ) {
        return res.status(400).json({
          message: "Invalid targetType",
        });
      }

      // validate rating
      const parsedRating = Number(rating);

      if (
        isNaN(parsedRating) ||
        parsedRating < 1 ||
        parsedRating > 5
      ) {
        return res.status(400).json({
          message: "Rating must be between 1-5",
        });
      }

      // create review
      const review = await Review.create({
        userId: req.user._id,
        targetId,
        targetType,
        rating: parsedRating,
        comment,
      });

      // save review images
      if (req.files?.length > 0) {
        const images = req.files.map((file) => ({
          reviewId: review._id,
          imageURL: `uploads/reviews/${file.filename}`,
        }));

        await ReviewImage.insertMany(images);
      }

      res.status(201).json({
        message: "Review created successfully",
        reviewId: review._id,
      });

    } catch (err) {

      // duplicate review
      if (err.code === 11000) {
        return res.status(400).json({
          message:
            "You already reviewed this item",
        });
      }

      console.error(
        "CREATE REVIEW ERROR:",
        err
      );

      res.status(500).json({
        message: "Server error",
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
      const { targetType, targetId } =
        req.params;

      const reviews = await Review.find({
        targetId,
        targetType,
      })
        .populate(
          "userId",
          "fullName profileImage email"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      const reviewIds = reviews.map(
        (review) => review._id
      );

      const images =
        await ReviewImage.find({
          reviewId: {
            $in: reviewIds,
          },
        }).lean();

      const imageMap = images.reduce(
        (acc, image) => {
          const key =
            image.reviewId.toString();

          if (!acc[key]) {
            acc[key] = [];
          }

          acc[key].push(
            image.imageURL
          );

          return acc;
        },
        {}
      );

      const formattedReviews =
        reviews.map((review) => ({
          ...review,

          images:
            imageMap[
              review._id.toString()
            ] || [],
        }));

      res.json(formattedReviews);

    } catch (err) {
      console.error(
        "GET REVIEWS ERROR:",
        err
      );

      res.status(500).json({
        message: "Server error",
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
        await Review.findOne({
          _id: req.params.id,
          userId: req.user._id,
        });

      if (!review) {
        return res.status(404).json({
          message: "Review not found",
        });
      }

      await ReviewImage.deleteMany({
        reviewId: review._id,
      });

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

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;