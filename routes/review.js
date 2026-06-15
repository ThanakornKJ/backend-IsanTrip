const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

const Review = require("../models/Review");
const ReviewImage = require("../models/ReviewImage");
const TouristPlace = require("../models/TouristPlace");
const Trip = require("../models/Trip");
const Festival = require("../models/Festival");
const protect = require("../middleware/authMiddleware");

const {
  uploadReviews,
  getCloudinaryImageUrl,
  getCloudinaryPublicId,
} = require("../middleware/upload");

const { REVIEW_POPULATE } = require("../utils/populateConfig");

// =====================================================
// ================= CONSTANTS =========================
// =====================================================

const ALLOWED_TARGET_TYPES = ["TouristPlace", "Trip", "Festival"];

// =====================================================
// ================= HELPERS ===========================
// =====================================================

const validateTarget = async (targetId, targetType) => {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return false;
  }

  if (targetType === "TouristPlace") {
    return !!(await TouristPlace.exists({ _id: targetId }));
  }

  if (targetType === "Trip") {
    return !!(await Trip.exists({ _id: targetId }));
  }

  if (targetType === "Festival") {
    return !!(await Festival.exists({ _id: targetId }));
  }

  return false;
};

const buildReviewImages = (reviewId, files = []) => {
  return files
    .map((file) => {
      const imageURL = getCloudinaryImageUrl(file);

      if (!imageURL) {
        return null;
      }

      return {
        reviewId,
        imageURL,
        publicId: getCloudinaryPublicId(file),
      };
    })
    .filter(Boolean);
};

const getReviewImages = async (reviewId) => {
  const images = await ReviewImage.find({
    reviewId,
  }).lean();

  return images.map((img) => img.imageURL);
};

const getReviewImagesMap = async (reviewIds) => {
  const images = await ReviewImage.find({
    reviewId: {
      $in: reviewIds,
    },
  }).lean();

  return images.reduce((acc, image) => {
    const key = image.reviewId.toString();

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(image.imageURL);

    return acc;
  }, {});
};

const formatReview = (review, images = []) => {
  return {
    _id: review._id,

    userId: review.userId?._id || review.userId || null,
    user: review.userId || null,

    targetId: review.targetId,
    targetType: review.targetType,

    rating: review.rating,
    comment: review.comment,

    images,

    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
};

const canDeleteReview = async (review, user) => {
  if (!review || !user) {
    return false;
  }

  const userId = user._id.toString();

  // Admin ลบได้ทุกรีวิว
  if (user.userType === "admin") {
    return true;
  }

  // เจ้าของรีวิวลบรีวิวตัวเองได้
  if (review.userId?.toString() === userId) {
    return true;
  }

  // เจ้าของทริปลบรีวิวในทริปตัวเองได้
  if (review.targetType === "Trip") {
    const trip = await Trip.findById(review.targetId).select("userId").lean();

    if (trip?.userId?.toString() === userId) {
      return true;
    }
  }

  return false;
};

// =====================================================
// ================= CREATE REVIEW =====================
// POST /api/review
// =====================================================

router.post(
  "/",
  protect,
  uploadReviews.array("images", 5),
  async (req, res) => {
    try {
      const { targetId, targetType, rating, comment } = req.body;

      if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
        return res.status(400).json({
          message: "Invalid targetType",
        });
      }

      const targetExists = await validateTarget(targetId, targetType);

      if (!targetExists) {
        return res.status(404).json({
          message: "Target not found",
        });
      }

      const parsedRating = Number(rating);

      if (
        Number.isNaN(parsedRating) ||
        parsedRating < 1 ||
        parsedRating > 5
      ) {
        return res.status(400).json({
          message: "Rating must be between 1-5",
        });
      }

      const review = await Review.create({
        userId: req.user._id,
        targetId,
        targetType,
        rating: parsedRating,
        comment: comment || "",
      });

      let imageUrls = [];

      if (req.files?.length > 0) {
        const images = buildReviewImages(review._id, req.files);

        if (images.length > 0) {
          await ReviewImage.insertMany(images);
          imageUrls = images.map((img) => img.imageURL);
        }
      }

      const populatedReview = await Review.findById(review._id)
        .populate(REVIEW_POPULATE)
        .lean();

      return res.status(201).json({
        message: "Review created successfully",
        review: formatReview(populatedReview, imageUrls),
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          message: "You already reviewed this item",
        });
      }

      console.error("CREATE REVIEW ERROR:", err);

      return res.status(500).json({
        message: "Create review failed",
      });
    }
  }
);

// =====================================================
// ============ GET REVIEWS BY TARGET ==================
// GET /api/review/:targetType/:targetId
// =====================================================

router.get("/:targetType/:targetId", async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    if (!ALLOWED_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        message: "Invalid targetType",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        message: "Invalid targetId",
      });
    }

    const reviews = await Review.find({
      targetId,
      targetType,
    })
      .populate(REVIEW_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    const reviewIds = reviews.map((review) => review._id);
    const imageMap = await getReviewImagesMap(reviewIds);

    const formattedReviews = reviews.map((review) =>
      formatReview(review, imageMap[review._id.toString()] || [])
    );

    const totalReviews = formattedReviews.length;

    const averageRating =
      totalReviews > 0
        ? Number(
            (
              formattedReviews.reduce((sum, item) => sum + item.rating, 0) /
              totalReviews
            ).toFixed(1)
          )
        : 0;

    return res.json({
      totalReviews,
      averageRating,
      reviews: formattedReviews,
    });
  } catch (err) {
    console.error("GET REVIEWS ERROR:", err);

    return res.status(500).json({
      message: "Load reviews failed",
    });
  }
});

// =====================================================
// ================= UPDATE REVIEW =====================
// PUT /api/review/:id
// เจ้าของรีวิวเท่านั้นที่แก้ไขได้
// =====================================================

router.put(
  "/:id",
  protect,
  uploadReviews.array("images", 5),
  async (req, res) => {
    try {
      const { rating, comment } = req.body;

      const review = await Review.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });

      if (!review) {
        return res.status(404).json({
          message: "Review not found",
        });
      }

      if (rating !== undefined) {
        const parsedRating = Number(rating);

        if (
          Number.isNaN(parsedRating) ||
          parsedRating < 1 ||
          parsedRating > 5
        ) {
          return res.status(400).json({
            message: "Rating must be between 1-5",
          });
        }

        review.rating = parsedRating;
      }

      if (comment !== undefined) {
        review.comment = comment;
      }

      await review.save();

      if (req.files?.length > 0) {
        await ReviewImage.deleteMany({
          reviewId: review._id,
        });

        const newImages = buildReviewImages(review._id, req.files);

        if (newImages.length > 0) {
          await ReviewImage.insertMany(newImages);
        }
      }

      const updatedReview = await Review.findById(review._id)
        .populate(REVIEW_POPULATE)
        .lean();

      const imageUrls = await getReviewImages(review._id);

      return res.json({
        message: "Review updated successfully",
        review: formatReview(updatedReview, imageUrls),
      });
    } catch (err) {
      console.error("UPDATE REVIEW ERROR:", err);

      return res.status(500).json({
        message: "Update review failed",
      });
    }
  }
);

// =====================================================
// ================= DELETE REVIEW =====================
// DELETE /api/review/:id
// เจ้าของรีวิว / เจ้าของทริป / Admin ลบได้
// =====================================================

router.delete("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const allowed = await canDeleteReview(review, req.user);

    if (!allowed) {
      return res.status(403).json({
        message: "Not allowed to delete this review",
      });
    }

    await Review.findByIdAndDelete(review._id);

    await ReviewImage.deleteMany({
      reviewId: review._id,
    });

    return res.json({
      message: "Review deleted successfully",
    });
  } catch (err) {
    console.error("DELETE REVIEW ERROR:", err);

    return res.status(500).json({
      message: "Delete review failed",
    });
  }
});

module.exports = router;