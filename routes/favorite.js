const express = require("express");
const router = express.Router();

const User = require("../models/User");
const TouristPlace = require("../models/TouristPlace");
const protect = require("../middleware/authMiddleware");


// ================= GET FAVORITES =================
router.get("/", protect, async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
      .populate({
        path: "favorites",
        select: "placeName province placeImages latitude longitude"
      });

    const favorites = user.favorites.map((p) => {

    let image = "";

    if (p.placeImages && p.placeImages.length > 0) {
      const cover =
        p.placeImages.find((img) => img.isCover) || p.placeImages[0];

      image = cover.imageURL || "";
    }

    return {
      _id: p._id,
      name: p.placeName,
      province: p.province,
      image: image
        ? `http://10.0.2.2:3000${image}`
        : "",
      distance: "-"
    };
  });

    res.json(favorites);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});


// ================= ADD FAVORITE =================
router.post("/:placeId", protect, async (req, res) => {
  try {
    const { placeId } = req.params;
    const user = await User.findById(req.user._id);
    const place = await TouristPlace.findById(placeId);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }
    if (user.favorites.includes(placeId)) {
      return res.status(400).json({ message: "Already favorite" });
    }
    user.favorites.push(placeId);
    await user.save();
    res.json({ message: "Added to favorites" });
  } catch (err) {
    console.error("ADD FAVORITE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= REMOVE FAVORITE =================
router.delete("/:placeId", protect, async (req, res) => {
  try {

    const { placeId } = req.params;

    const user = await User.findById(req.user._id);

    user.favorites = user.favorites.filter(
      (id) => id.toString() !== placeId
    );

    await user.save();

    res.json({ message: "Favorite removed" });

  } catch (err) {
    console.error("REMOVE FAVORITE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// ================= CHECK FAVORITE =================
router.get("/check/:placeId", protect, async (req, res) => {
  try {

    const user = await User.findById(req.user._id);

    const isFavorite = user.favorites.includes(req.params.placeId);

    res.json({ isFavorite });

  } catch (err) {
    console.error("CHECK FAVORITE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;