const express = require("express");
const router = express.Router();
const Review      = require("../models/Review");
const ReviewImage = require("../models/ReviewImage");
const protect     = require("../middleware/authMiddleware");
const multer      = require("multer");
const path        = require("path");
const fs          = require("fs");

// Uploader สำหรับรูปรีวิว
const reviewUploadDir = "uploads/reviews";
if (!fs.existsSync(reviewUploadDir)) {
  fs.mkdirSync(reviewUploadDir, { recursive: true });
}
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, reviewUploadDir),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`),
});
const uploadReviews = multer({ storage: reviewStorage });

// ================= CREATE REVIEW =================
router.post(
  "/",
  protect,
  uploadReviews.array("images", 5),
  async (req, res) => {
    try {
      const { targetId, targetType, rating, comment } = req.body;

      if (!["TouristPlace", "Festival"].includes(targetType)) {
        return res.status(400).json({ message: "targetType ไม่ถูกต้อง" });
      }

      const review = await Review.create({
        userId: req.user._id,
        targetId, targetType,
        rating: Number(rating),
        comment,
      });

      // บันทึกรูปถ้ามี
      if (req.files?.length > 0) {
        const images = req.files.map((file) => ({
          reviewId: review._id,
          imageURL: `uploads/reviews/${file.filename}`,
        }));
        await ReviewImage.insertMany(images);
      }

      res.status(201).json({ message: "รีวิวสำเร็จ", reviewId: review._id });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: "คุณรีวิวแล้ว" });
      }
      console.error("CREATE REVIEW ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ================= GET REVIEWS BY TARGET =================
router.get("/:targetType/:targetId", async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const reviews = await Review.find({ targetId, targetType })
      .populate("userId", "fullName profileImage")
      .sort({ createdAt: -1 })
      .lean();

    // ดึงรูปแต่ละรีวิว
    const reviewIds = reviews.map((r) => r._id);
    const images    = await ReviewImage.find({ reviewId: { $in: reviewIds } }).lean();

    const imageMap = images.reduce((acc, img) => {
      const key = img.reviewId.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(img.imageURL);
      return acc;
    }, {});

    const result = reviews.map((r) => ({
      ...r,
      images: imageMap[r._id.toString()] || [],
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= DELETE REVIEW =================
router.delete("/:id", protect, async (req, res) => {
  try {
    const review = await Review.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!review) {
      return res.status(404).json({ message: "ไม่พบรีวิว" });
    }

    await ReviewImage.deleteMany({ reviewId: review._id });
    await review.deleteOne();

    res.json({ message: "ลบรีวิวสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;