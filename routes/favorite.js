const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorite");
const TouristPlace = require("../models/TouristPlace");
const protect = require("../middleware/authMiddleware");

// ================= GET FAVORITES =================
router.get("/", protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user._id })
      .populate({
        path: "placeId",
        select: "placeName provinceId placeImages latitude longitude",
        populate: { path: "provinceId", select: "name" },
      })
      .lean();

    const formatted = favorites.map((fav) => {
      const p = fav.placeId;
      const cover =
        p.placeImages?.find((img) => img.isCover) || p.placeImages?.[0];
      return {
        _id:      p._id,
        favoriteId: fav._id,
        name:     p.placeName,
        province: p.provinceId?.name || "",
        image:    cover?.imageURL
          ? `http://10.0.2.2:3000/${cover.imageURL}`
          : "",
        distance: "-",
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ================= ADD FAVORITE =================
router.post("/:placeId", protect, async (req, res) => {
  try {
    const place = await TouristPlace.findById(req.params.placeId);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    await Favorite.create({
      userId:  req.user._id,
      placeId: req.params.placeId,
    });

    res.json({ message: "Added to favorites" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Already favorite" });
    }
    console.error("ADD FAVORITE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= REMOVE FAVORITE =================
router.delete("/:placeId", protect, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      userId:  req.user._id,
      placeId: req.params.placeId,
    });
    res.json({ message: "Favorite removed" });
  } catch (err) {
    console.error("REMOVE FAVORITE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= CHECK FAVORITE =================
router.get("/check/:placeId", protect, async (req, res) => {
  try {
    const fav = await Favorite.findOne({
      userId:  req.user._id,
      placeId: req.params.placeId,
    });
    res.json({ isFavorite: !!fav });
  } catch (err) {
    console.error("CHECK FAVORITE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;