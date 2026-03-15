const express = require("express");
const router = express.Router();
const Festival = require("../models/Festival");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { uploadFestivals } = require("../middleware/upload");


// ================= GET ALL FESTIVALS =================
router.get("/", protect, async (req, res) => {
  try {

    const festivals = await Festival.find()
      .populate("festivalLocations.placeId", "placeName province")
      .sort({ startDate: -1 });

    res.json(festivals);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= GET FESTIVAL BY ID =================
router.get("/:id", protect, async (req, res) => {
  try {

    const festival = await Festival.findById(req.params.id)
      .populate("festivalLocations.placeId", "placeName province");

    if (!festival) {
      return res.status(404).json({ message: "Festival not found" });
    }

    res.json(festival);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ================= CREATE FESTIVAL =================
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadFestivals.array("images", 10),
  async (req, res) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations
      } = req.body;
      let festivalImages = [];
      if (req.files && req.files.length > 0) {
        festivalImages = req.files.map((file, index) => ({
          imageURL: `uploads/festivals/${file.filename}`,
          isCover: index === 0
        }));

      }
      const locations = festivalLocations
        ? JSON.parse(festivalLocations)
        : [];
      const newFestival = await Festival.create({
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalImages,
        festivalLocations: locations
      });
      res.status(201).json(newFestival);
    } catch (err) {
      console.error("CREATE FESTIVAL ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);


// ================= UPDATE FESTIVAL =================
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadFestivals.array("images", 10),
  async (req, res) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations
      } = req.body;
      let updateData = {
        festivalName,
        description,
        startDate,
        endDate,
        province
      };
      if (festivalLocations) {
        updateData.festivalLocations = JSON.parse(festivalLocations);
      }
      if (req.files && req.files.length > 0) {
        updateData.festivalImages = req.files.map((file, index) => ({
          imageURL: `uploads/festivals/${file.filename}`,
          isCover: index === 0
        }));

      }
      const updated = await Festival.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Festival not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("UPDATE FESTIVAL ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);


// ================= DELETE FESTIVAL =================
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const deleted = await Festival.findByIdAndDelete(req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: "Festival not found" });
      }

      res.json({ message: "Festival deleted" });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


module.exports = router;