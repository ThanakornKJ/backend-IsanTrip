const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Favorite = require("../models/Favorite");
const TouristPlace = require("../models/TouristPlace");

const protect = require("../middleware/authMiddleware");
const { FAVORITE_POPULATE } = require("../utils/populateConfig");

// =====================================================
// ================= HELPERS ===========================
// =====================================================

const buildImageURL = (req, imagePath) => {
  if (!imagePath) {
    return "";
  }

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  const cleaned = imagePath.replace(/^\/+/, "");

  return `${req.protocol}://${req.get("host")}/${cleaned}`;
};

const formatFavorite = (req, favorite) => {
  const place = favorite.placeId;

  if (!place) {
    return null;
  }

  const coverImage =
    place.placeImages?.find((img) => img.isCover) ||
    place.placeImages?.[0];

  return {
    _id: place._id,
    favoriteId: favorite._id,

    placeName: place.placeName,
    province: place.provinceId?.name || "",
    category: place.categoryId?.name || "",
    touristType: place.typeId?.name || "",

    latitude: place.latitude,
    longitude: place.longitude,

    image: buildImageURL(req, coverImage?.imageURL),

    createdAt: favorite.createdAt,
  };
};

// =====================================================
// ================= GET FAVORITES =====================
// =====================================================

router.get("/", protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({
      userId: req.user._id,
    })
      .populate(FAVORITE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    const formatted = favorites
      .map((fav) => formatFavorite(req, fav))
      .filter(Boolean);

    res.json(formatted);
  } catch (err) {
    console.error("GET FAVORITES ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= ADD FAVORITE ======================
// =====================================================

router.post("/:placeId", protect, async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({
        message: "Invalid place id",
      });
    }

    const place = await TouristPlace.findById(placeId);

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    const exists = await Favorite.findOne({
      userId: req.user._id,
      placeId,
    });

    if (exists) {
      return res.status(400).json({
        message: "Already favorite",
      });
    }

    const favorite = await Favorite.create({
      userId: req.user._id,
      placeId,
    });

    res.status(201).json({
      message: "Added to favorites",
      favoriteId: favorite._id,
    });
  } catch (err) {
    console.error("ADD FAVORITE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= REMOVE FAVORITE ===================
// =====================================================

router.delete("/:placeId", protect, async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({
        message: "Invalid place id",
      });
    }

    const deleted = await Favorite.findOneAndDelete({
      userId: req.user._id,
      placeId,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Favorite not found",
      });
    }

    res.json({
      message: "Favorite removed",
    });
  } catch (err) {
    console.error("REMOVE FAVORITE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= CHECK FAVORITE ====================
// =====================================================

router.get("/check/:placeId", protect, async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({
        message: "Invalid place id",
      });
    }

    const favorite = await Favorite.findOne({
      userId: req.user._id,
      placeId,
    }).select("_id");

    res.json({
      isFavorite: !!favorite,
      favoriteId: favorite?._id || null,
    });
  } catch (err) {
    console.error("CHECK FAVORITE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
