const express = require("express");
const router = express.Router();

const Festival = require("../models/Festival");
const Province = require("../models/Province");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { uploadFestivals } = require("../middleware/upload");
const { FESTIVAL_POPULATE } = require("../utils/populateConfig");

// =====================================================
// ================= HELPERS ===========================
// =====================================================

const parseJsonField = (field) => {
  if (!field) {
    return [];
  }

  if (typeof field === "string") {
    return JSON.parse(field);
  }

  return field;
};

const buildFestivalImages = (files = []) => {
  return files.map((file, index) => ({
    imageURL: `/uploads/festivals/${file.filename}`,
    isCover: index === 0,
  }));
};

const buildFestivalLocations = (festivalLocations) => {
  const locationsData = parseJsonField(festivalLocations);

  if (!Array.isArray(locationsData)) {
    return [];
  }

  return locationsData.map((item) => ({
    placeId: item.placeId,
    eventDate: item.eventDate || null,
    description: item.description || "",
  }));
};

// =====================================================
// ================= GET ALL FESTIVALS =================
// =====================================================

router.get("/", protect, async (req, res) => {
  try {
    const festivals = await Festival.find()
      .populate(FESTIVAL_POPULATE)
      .sort({ startDate: -1 })
      .lean();

    res.json(festivals);
  } catch (err) {
    console.error("GET FESTIVALS ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET FESTIVAL BY ID ================
// =====================================================

router.get("/:id", protect, async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id)
      .populate(FESTIVAL_POPULATE)
      .lean();

    if (!festival) {
      return res.status(404).json({
        message: "Festival not found",
      });
    }

    res.json(festival);
  } catch (err) {
    console.error("GET FESTIVAL ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= CREATE FESTIVAL ===================
// =====================================================

router.post(
  "/",
  protect,
  authorize("admin"),
  uploadFestivals.array("festivalImages", 10),
  async (req, res) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations,
      } = req.body;

      if (!festivalName || !startDate || !endDate || !province) {
        return res.status(400).json({
          message: "festivalName, startDate, endDate และ province จำเป็นต้องกรอก",
        });
      }

      const provinceDoc = await Province.findOne({ name: province });

      if (!provinceDoc) {
        return res.status(400).json({
          message: "ไม่พบจังหวัด",
        });
      }

      const createdFestival = await Festival.create({
        festivalName,
        description: description || "",
        startDate,
        endDate,
        provinceId: provinceDoc._id,
        festivalImages: buildFestivalImages(req.files || []),
        festivalLocations: buildFestivalLocations(festivalLocations),
      });

      const populatedFestival = await Festival.findById(createdFestival._id)
        .populate(FESTIVAL_POPULATE)
        .lean();

      res.status(201).json(populatedFestival);
    } catch (err) {
      console.error("CREATE FESTIVAL ERROR:", err);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= UPDATE FESTIVAL ===================
// =====================================================

router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadFestivals.array("festivalImages", 10),
  async (req, res) => {
    try {
      const festival = await Festival.findById(req.params.id);

      if (!festival) {
        return res.status(404).json({
          message: "Festival not found",
        });
      }

      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations,
      } = req.body;

      if (festivalName !== undefined) festival.festivalName = festivalName;
      if (description !== undefined) festival.description = description;
      if (startDate !== undefined) festival.startDate = startDate;
      if (endDate !== undefined) festival.endDate = endDate;

      if (province !== undefined) {
        const provinceDoc = await Province.findOne({ name: province });

        if (!provinceDoc) {
          return res.status(400).json({
            message: "ไม่พบจังหวัด",
          });
        }

        festival.provinceId = provinceDoc._id;
      }

      if (festivalLocations !== undefined) {
        festival.festivalLocations = buildFestivalLocations(festivalLocations);
      }

      if (req.files?.length > 0) {
        festival.festivalImages = buildFestivalImages(req.files);
      }

      await festival.save();

      const updatedFestival = await Festival.findById(festival._id)
        .populate(FESTIVAL_POPULATE)
        .lean();

      res.json(updatedFestival);
    } catch (err) {
      console.error("UPDATE FESTIVAL ERROR:", err);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= DELETE FESTIVAL ===================
// =====================================================

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deletedFestival = await Festival.findByIdAndDelete(req.params.id);

    if (!deletedFestival) {
      return res.status(404).json({
        message: "Festival not found",
      });
    }

    res.json({
      message: "Festival deleted successfully",
    });
  } catch (err) {
    console.error("DELETE FESTIVAL ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
