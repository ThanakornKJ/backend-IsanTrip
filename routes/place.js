const express = require("express");
const router = express.Router();

const TouristPlace = require("../models/TouristPlace");
const Province = require("../models/Province");
const Category = require("../models/Category");
const PlaceType = require("../models/PlaceType");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { uploadPlaces } = require("../middleware/upload");
const { PLACE_POPULATE } = require("../utils/populateConfig");

// =====================================================
// ================= FORMAT PLACE ======================
// =====================================================

const formatPlace = (place) => {
  const coverImage =
    place.placeImages?.find((img) => img.isCover) ||
    place.placeImages?.[0];

  return {
    _id: place._id,
    placeName: place.placeName,
    description: place.description,
    address: place.address,

    // populated objects for Flutter models
    provinceId: place.provinceId,
    categoryId: place.categoryId,
    typeId: place.typeId,

    // helper strings for simple UI cards
    province: place.provinceId?.name || "",
    category: place.categoryId?.name || "",
    touristType: place.typeId?.name || "",

    latitude: place.latitude,
    longitude: place.longitude,
    location: place.location,

    openingHours: place.openingHours,
    contact: place.contact,
    entranceFee: place.entranceFee,
    socialMedia: place.socialMedia,
    highlight: place.highlight,
    travelInfo: place.travelInfo,

    placeImages: place.placeImages || [],
    coverImage: coverImage?.imageURL || null,

    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  };
};

// =====================================================
// ================= HELPERS ===========================
// =====================================================

const buildPlaceFilter = async (query) => {
  const { keyword, province, category, type, touristType } = query;
  const filter = {};

  if (province && province !== "ทุกจังหวัด") {
    const provinceDoc = await Province.findOne({ name: province });
    if (provinceDoc) {
      filter.provinceId = provinceDoc._id;
    }
  }

  if (category) {
    const categoryDoc = await Category.findOne({ name: category });
    if (categoryDoc) {
      filter.categoryId = categoryDoc._id;
    }
  }

  const typeName = touristType || type;

  if (typeName) {
    const typeDoc = await PlaceType.findOne({ name: typeName });
    if (typeDoc) {
      filter.typeId = typeDoc._id;
    }
  }

  if (keyword) {
    filter.$or = [
      { placeName: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
      { address: { $regex: keyword, $options: "i" } },
      { highlight: { $regex: keyword, $options: "i" } },
    ];
  }

  return filter;
};

const resolveRelationIds = async ({ province, category, touristType }) => {
  const [provinceDoc, categoryDoc, typeDoc] = await Promise.all([
    province ? Province.findOne({ name: province }) : null,
    category ? Category.findOne({ name: category }) : null,
    touristType ? PlaceType.findOne({ name: touristType }) : null,
  ]);

  return {
    provinceId: provinceDoc?._id || null,
    categoryId: categoryDoc?._id || null,
    typeId: typeDoc?._id || null,
  };
};

const parseNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPlaceImages = (files = []) => {
  return files.map((file, index) => ({
    imageURL: `/uploads/places/${file.filename}`,
    isCover: index === 0,
  }));
};

// =====================================================
// ================= SEARCH PLACE ======================
// =====================================================

router.get("/search", protect, async (req, res) => {
  try {
    const filter = await buildPlaceFilter(req.query);

    const places = await TouristPlace.find(filter)
      .populate(PLACE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(places.map(formatPlace));
  } catch (err) {
    console.error("SEARCH PLACE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET ALL PLACES ====================
// =====================================================

router.get("/", protect, async (req, res) => {
  try {
    const filter = await buildPlaceFilter(req.query);

    const places = await TouristPlace.find(filter)
      .populate(PLACE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(places.map(formatPlace));
  } catch (err) {
    console.error("GET ALL PLACE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET PLACES BY CATEGORY ============
// =====================================================

router.get("/category/:category", protect, async (req, res) => {
  try {
    const categoryDoc = await Category.findOne({
      name: req.params.category,
    });

    if (!categoryDoc) {
      return res.json([]);
    }

    const places = await TouristPlace.find({
      categoryId: categoryDoc._id,
    })
      .populate(PLACE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(places.map(formatPlace));
  } catch (err) {
    console.error("GET PLACES BY CATEGORY ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET PLACE BY ID ===================
// =====================================================

router.get("/:id", protect, async (req, res) => {
  try {
    const place = await TouristPlace.findById(req.params.id)
      .populate(PLACE_POPULATE)
      .lean();

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    res.json(formatPlace(place));
  } catch (err) {
    console.error("GET PLACE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= CREATE PLACE ======================
// =====================================================

router.post(
  "/",
  protect,
  authorize("admin"),
  uploadPlaces.array("placeImages", 10),
  async (req, res) => {
    try {
      const {
        placeName,
        description,
        address,
        province,
        category,
        touristType,
        openingHours,
        contact,
        entranceFee,
        latitude,
        longitude,
        socialMedia,
        highlight,
        travelInfo,
      } = req.body;

      if (!placeName) {
        return res.status(400).json({
          message: "placeName is required",
        });
      }

      const { provinceId, categoryId, typeId } = await resolveRelationIds({
        province,
        category,
        touristType,
      });

      const lat = parseNumber(latitude);
      const lng = parseNumber(longitude);

      const createdPlace = await TouristPlace.create({
        placeName,
        description,
        address,
        provinceId,
        categoryId,
        typeId,
        latitude: lat,
        longitude: lng,
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
        openingHours,
        contact,
        entranceFee,
        socialMedia,
        highlight,
        travelInfo,
        placeImages: buildPlaceImages(req.files || []),
      });

      const populatedPlace = await TouristPlace.findById(createdPlace._id)
        .populate(PLACE_POPULATE)
        .lean();

      res.status(201).json(formatPlace(populatedPlace));
    } catch (err) {
      console.error("CREATE PLACE ERROR:", err);

      if (err.code === 11000) {
        return res.status(400).json({
          message: "Place name already exists",
        });
      }

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= UPDATE PLACE ======================
// =====================================================

router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadPlaces.array("placeImages", 10),
  async (req, res) => {
    try {
      const place = await TouristPlace.findById(req.params.id);

      if (!place) {
        return res.status(404).json({
          message: "Place not found",
        });
      }

      const {
        placeName,
        description,
        address,
        province,
        category,
        touristType,
        openingHours,
        contact,
        entranceFee,
        latitude,
        longitude,
        socialMedia,
        highlight,
        travelInfo,
      } = req.body;

      if (placeName !== undefined) place.placeName = placeName;
      if (description !== undefined) place.description = description;
      if (address !== undefined) place.address = address;
      if (openingHours !== undefined) place.openingHours = openingHours;
      if (contact !== undefined) place.contact = contact;
      if (entranceFee !== undefined) place.entranceFee = entranceFee;
      if (socialMedia !== undefined) place.socialMedia = socialMedia;
      if (highlight !== undefined) place.highlight = highlight;
      if (travelInfo !== undefined) place.travelInfo = travelInfo;

      if (
        province !== undefined ||
        category !== undefined ||
        touristType !== undefined
      ) {
        const relationIds = await resolveRelationIds({
          province,
          category,
          touristType,
        });

        if (province !== undefined) place.provinceId = relationIds.provinceId;
        if (category !== undefined) place.categoryId = relationIds.categoryId;
        if (touristType !== undefined) place.typeId = relationIds.typeId;
      }

      if (latitude !== undefined) {
        place.latitude = parseNumber(latitude, place.latitude);
      }

      if (longitude !== undefined) {
        place.longitude = parseNumber(longitude, place.longitude);
      }

      place.location = {
        type: "Point",
        coordinates: [place.longitude || 0, place.latitude || 0],
      };

      if (req.files?.length > 0) {
        place.placeImages = buildPlaceImages(req.files);
      }

      await place.save();

      const updatedPlace = await TouristPlace.findById(place._id)
        .populate(PLACE_POPULATE)
        .lean();

      res.json(formatPlace(updatedPlace));
    } catch (err) {
      console.error("UPDATE PLACE ERROR:", err);

      if (err.code === 11000) {
        return res.status(400).json({
          message: "Place name already exists",
        });
      }

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= DELETE PLACE ======================
// =====================================================

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deletedPlace = await TouristPlace.findByIdAndDelete(req.params.id);

    if (!deletedPlace) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    res.json({
      message: "Place deleted successfully",
    });
  } catch (err) {
    console.error("DELETE PLACE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
