const express = require("express");
const bcrypt = require("bcryptjs");

const router = express.Router();

const User = require("../models/User");
const TouristPlace = require("../models/TouristPlace");
const Trip = require("../models/Trip");
const Festival = require("../models/Festival");
const Review = require("../models/Review");

const Province = require("../models/Province");
const Category = require("../models/Category");
const PlaceType = require("../models/PlaceType");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const { uploadPlaces, uploadTrips } = require("../middleware/upload");
const { PLACE_POPULATE, TRIP_POPULATE } = require("../utils/populateConfig");

// =====================================================
// ================= HELPERS ===========================
// =====================================================

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

const parseJsonField = (field) => {
  if (!field) {
    return [];
  }

  if (typeof field === "string") {
    return JSON.parse(field);
  }

  return field;
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

const buildTripImages = (files = []) => {
  return files.map((file, index) => ({
    imageURL: `/uploads/trips/${file.filename}`,
    isCover: index === 0,
  }));
};

const buildTripPlaces = (tripPlaces) => {
  const placesData = parseJsonField(tripPlaces);

  if (!Array.isArray(placesData)) {
    return [];
  }

  return placesData
    .map((item, index) => ({
      placeId: item.placeId,
      sequenceNo: Number(item.sequenceNo) || index + 1,
      visitDate: item.visitDate || null,
    }))
    .sort((a, b) => a.sequenceNo - b.sequenceNo);
};

const buildTripFestivals = (tripFestivals) => {
  const festivalsData = parseJsonField(tripFestivals);

  if (!Array.isArray(festivalsData)) {
    return [];
  }

  return festivalsData.map((item) => ({
    festivalId: item.festivalId,
    attendDate: item.attendDate || null,
  }));
};

const formatUser = (user) => {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    facebookId: user.facebookId,
    profileImage: user.profileImage,
    userType: user.userType,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// =====================================================
// ================= CREATE PLACE ======================
// =====================================================

router.post(
  "/places",
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

      const parsedLatitude = parseNumber(latitude);
      const parsedLongitude = parseNumber(longitude);

      const newPlace = await TouristPlace.create({
        placeName,
        description,
        address,
        provinceId,
        categoryId,
        typeId,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        location: {
          type: "Point",
          coordinates: [parsedLongitude, parsedLatitude],
        },
        openingHours,
        contact,
        entranceFee,
        socialMedia,
        highlight,
        travelInfo,
        placeImages: buildPlaceImages(req.files || []),
      });

      const populated = await TouristPlace.findById(newPlace._id)
        .populate(PLACE_POPULATE)
        .lean();

      res.status(201).json(populated);
    } catch (err) {
      console.error("CREATE PLACE ERROR:", err);

      if (err.code === 11000) {
        return res.status(400).json({
          message: "Place already exists",
        });
      }

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= GET ALL PLACES ====================
// =====================================================

router.get("/places", protect, authorize("admin"), async (req, res) => {
  try {
    const places = await TouristPlace.find()
      .populate(PLACE_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(places);
  } catch (err) {
    console.error("GET PLACES ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET PLACE BY ID ===================
// =====================================================

router.get("/places/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const place = await TouristPlace.findById(req.params.id)
      .populate(PLACE_POPULATE)
      .lean();

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    res.json(place);
  } catch (err) {
    console.error("GET PLACE ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= UPDATE PLACE ======================
// =====================================================

router.put(
  "/places/:id",
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

      const updated = await TouristPlace.findById(place._id)
        .populate(PLACE_POPULATE)
        .lean();

      res.json(updated);
    } catch (err) {
      console.error("UPDATE PLACE ERROR:", err);

      if (err.code === 11000) {
        return res.status(400).json({
          message: "Place already exists",
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

router.delete("/places/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deleted = await TouristPlace.findByIdAndDelete(req.params.id);

    if (!deleted) {
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

// =====================================================
// ================= ADMIN STATS =======================
// =====================================================

router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const [
      totalUsers,
      totalPlaces,
      totalTrips,
      totalFestivals,
      totalReviews,
    ] = await Promise.all([
      User.countDocuments(),
      TouristPlace.countDocuments(),
      Trip.countDocuments(),
      Festival.countDocuments(),
      Review.countDocuments(),
    ]);

    res.json({
      totalUsers,
      totalPlaces,
      totalTrips,
      totalFestivals,
      totalReviews,
    });
  } catch (err) {
    console.error("STATS ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= UPDATE TRIP =======================
// =====================================================

router.put(
  "/trips/:id",
  protect,
  authorize("admin"),
  uploadTrips.array("tripImages", 10),
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          message: "Trip not found",
        });
      }

      const {
        tripName,
        startDate,
        endDate,
        description,
        startLocation,
        tripPlaces,
        tripFestivals,
        isPublic,
      } = req.body;

      if (tripName !== undefined) trip.tripName = tripName;
      if (startDate !== undefined) trip.startDate = startDate;
      if (endDate !== undefined) trip.endDate = endDate;
      if (description !== undefined) trip.description = description;
      if (startLocation !== undefined) trip.startLocation = startLocation;

      if (typeof isPublic !== "undefined") {
        trip.isPublic = isPublic === true || isPublic === "true";
      }

      if (tripPlaces !== undefined) {
        trip.tripPlaces = buildTripPlaces(tripPlaces);
      }

      if (tripFestivals !== undefined) {
        trip.tripFestivals = buildTripFestivals(tripFestivals);
      }

      if (req.files?.length > 0) {
        trip.tripImages = buildTripImages(req.files);
      }

      await trip.save();

      const updatedTrip = await Trip.findById(trip._id)
        .populate(TRIP_POPULATE)
        .lean();

      res.json(updatedTrip);
    } catch (err) {
      console.error("UPDATE TRIP ERROR:", err);

      res.status(500).json({
        message: "Update trip failed",
      });
    }
  }
);

// =====================================================
// ================= GET ALL TRIPS =====================
// =====================================================

router.get("/trips", protect, authorize("admin"), async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate(TRIP_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(trips);
  } catch (err) {
    console.error("GET TRIPS ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET TRIP BY ID ====================
// =====================================================

router.get("/trips/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate(TRIP_POPULATE)
      .lean();

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    res.json(trip);
  } catch (err) {
    console.error("GET TRIP ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= DELETE TRIP =======================
// =====================================================

router.delete("/trips/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);

    if (!deletedTrip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    res.json({
      message: "Trip deleted successfully",
    });
  } catch (err) {
    console.error("DELETE TRIP ERROR:", err);

    res.status(500).json({
      message: "Delete trip failed",
    });
  }
});

// =====================================================
// ================= UPDATE TRIP STATUS ================
// =====================================================

router.put(
  "/trips/:id/status",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { isPublic } = req.body;

      const trip = await Trip.findByIdAndUpdate(
        req.params.id,
        {
          isPublic: isPublic === true || isPublic === "true",
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(TRIP_POPULATE)
        .lean();

      if (!trip) {
        return res.status(404).json({
          message: "Trip not found",
        });
      }

      res.json(trip);
    } catch (err) {
      console.error("UPDATE TRIP STATUS ERROR:", err);

      res.status(500).json({
        message: "Update status failed",
      });
    }
  }
);

// =====================================================
// ================= GET ALL USERS =====================
// =====================================================

router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json(users.map(formatUser));
  } catch (err) {
    console.error("GET USERS ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= UPDATE USER =======================
// =====================================================

router.put("/users/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { fullName, email, password, userType, profileImage } = req.body;

    const user = await User.findById(req.params.id).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (email && email !== user.email) {
      const exists = await User.findOne({
        email,
        _id: {
          $ne: user._id,
        },
      });

      if (exists) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }

      user.email = email;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (userType !== undefined) user.userType = userType;
    if (profileImage !== undefined) user.profileImage = profileImage;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    const result = await User.findById(user._id).lean();

    res.json(formatUser(result));
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= DELETE USER =======================
// =====================================================

router.delete("/users/:id", protect, authorize("admin"), async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        message: "Cannot delete yourself",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
