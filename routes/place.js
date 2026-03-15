const express = require("express");
const TouristPlace = require("../models/TouristPlace");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { uploadPlaces } = require("../middleware/upload");
const router = express.Router();

// ================= SEARCH PLACE =================
router.get("/search", protect, async (req, res) => {
  try {
    const { keyword, province } = req.query;
    let filter = {};
    if (province && province !== "ทุกจังหวัด") {
      filter.province = province;
    }
    if (keyword) {
      filter.$or = [
        { placeName: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }
    const places = await TouristPlace.find(filter);
    res.json(places);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET ALL PLACES (รองรับ filter province) =================
router.get("/", protect, async (req, res) => {
  try {
    const { province } = req.query;

    let filter = {};

    if (province && province !== "ทุกจังหวัด") {
      filter.province = province;
    }

    const places = await TouristPlace.find(filter);

    res.json(places);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= GET PLACE BY ID =================
router.get("/:id", protect, async (req, res) => {
  try {
    const place = await TouristPlace.findById(req.params.id);

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json(place);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= CREATE PLACE (ADMIN ONLY) =================
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 5),
  async (req, res) => {
    try {
      const {
        placeName,
        description,
        province,
        latitude,
        longitude,
        category,
        touristType,
        openingHours,
        contact,
        price,
        imageUrls 
      } = req.body;
      if (!placeName || !province) {
        return res.status(400).json({
          message: "placeName และ province จำเป็นต้องกรอก",
        });
      }
      let placeImages = [];
      if (req.files && req.files.length > 0) {
        placeImages = req.files.map((file, index) => ({
          imageURL: `uploads/places/${file.filename}`,
          isCover: index === 0,
        }));
      }
      if (imageUrls) {
        const urls = Array.isArray(imageUrls)
          ? imageUrls
          : [imageUrls];

        urls.forEach((url, index) => {
          placeImages.push({
            imageURL: url,
            isCover: placeImages.length === 0 && index === 0,
          });
        });
      }
      const newPlace = await TouristPlace.create({
        placeName,
        description,
        province,
        latitude,
        longitude,
        category,
        touristType,
        openingHours,
        contact,
        price,
        placeImages,
      });

      res.status(201).json(newPlace);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


// ================= UPDATE PLACE (ADMIN ONLY) =================
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 5),
  async (req, res) => {
    try {
      const {
        placeName,
        description,
        province,
        latitude,
        longitude,
        category,
        touristType,
        openingHours,
        contact,
        price
      } = req.body;
      let updateData = {
        placeName,
        description,
        province,
        latitude,
        longitude,
        category,
        touristType,
        openingHours,
        contact,
        price
      };
      if (req.files && req.files.length > 0) {
        const placeImages = req.files.map((file, index) => ({
          imageURL: `uploads/places/${file.filename}`,
          isCover: index === 0
        }));
        updateData.placeImages = placeImages;
      }
      const updatedPlace = await TouristPlace.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!updatedPlace) {
        return res.status(404).json({ message: "Place not found" });
      }
      res.json(updatedPlace);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


// ================= DELETE PLACE (ADMIN ONLY) =================
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deletedPlace = await TouristPlace.findByIdAndDelete(req.params.id);

    if (!deletedPlace) {
      return res.status(404).json({ message: "Place not found" });
    }

    res.json({ message: "Place deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET PLACE BY CATEGORY =================
router.get("/category/:category", async (req, res) => {
  try {

    const places = await TouristPlace.find({
      category: req.params.category
    }).lean();

    res.json(places);

  } catch (err) {
    console.error("GET CATEGORY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

function interpolatePoints(start, end, steps = 20) {
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const lat =
      start.lat + (end.lat - start.lat) * (i / steps);

    const lng =
      start.lng + (end.lng - start.lng) * (i / steps);

    points.push({ lat, lng });
  }

  return points;
}

router.post("/route-recommendations", async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.body;

    const points = interpolatePoints(
      { lat: startLat, lng: startLng },
      { lat: endLat, lng: endLng },
      25
    );
    let results = [];
    for (let p of points) {
      const places = await TouristPlace.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [p.lng, p.lat]
            },
            $maxDistance: 30000
          }
        }
      }).limit(5);
      results.push(...places);
    }
    const unique = [
      ...new Map(results.map(item => [item._id, item])).values()
    ];
    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;