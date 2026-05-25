const express = require("express");
const router = express.Router();

const Trip = require("../models/Trip");

const protect = require("../middleware/authMiddleware");
const { uploadTrips } = require("../middleware/upload");
const { TRIP_POPULATE } = require("../utils/populateConfig");

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

// =====================================================
// ================= CREATE TRIP =======================
// =====================================================

router.post(
  "/create",
  protect,
  uploadTrips.array("tripImages", 10),
  async (req, res) => {
    try {
      const {
        tripName,
        startDate,
        endDate,
        startLocation,
        description,
        isPublic,
        tripPlaces,
        tripFestivals,
      } = req.body;

      if (!tripName || !startDate || !endDate) {
        return res.status(400).json({
          message: "tripName, startDate และ endDate จำเป็นต้องกรอก",
        });
      }

      const createdTrip = await Trip.create({
        userId: req.user._id,
        tripName,
        startDate,
        endDate,
        startLocation: startLocation || "",
        description: description || "",
        isPublic: isPublic === true || isPublic === "true",
        tripImages: buildTripImages(req.files || []),
        tripPlaces: buildTripPlaces(tripPlaces),
        tripFestivals: buildTripFestivals(tripFestivals),
      });

      const populatedTrip = await Trip.findById(createdTrip._id)
        .populate(TRIP_POPULATE)
        .lean();

      res.status(201).json(populatedTrip);
    } catch (err) {
      console.error("CREATE TRIP ERROR:", err);

      res.status(500).json({
        message: "Create trip failed",
      });
    }
  }
);

// =====================================================
// ================= GET MY TRIPS ======================
// =====================================================

router.get("/my-trips", protect, async (req, res) => {
  try {
    const trips = await Trip.find({
      userId: req.user._id,
    })
      .populate(TRIP_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(trips);
  } catch (err) {
    console.error("GET MY TRIPS ERROR:", err);

    res.status(500).json({
      message: "Load trips failed",
    });
  }
});

// =====================================================
// ================= GET PUBLIC TRIPS ==================
// =====================================================

router.get("/public", async (req, res) => {
  try {
    const trips = await Trip.find({
      isPublic: true,
    })
      .populate(TRIP_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(trips);
  } catch (err) {
    console.error("GET PUBLIC TRIPS ERROR:", err);

    res.status(500).json({
      message: "Load public trips failed",
    });
  }
});

// =====================================================
// ================= GET SINGLE TRIP ===================
// =====================================================

router.get("/:id", protect, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate(TRIP_POPULATE)
      .lean();

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const ownerId = trip.userId?._id?.toString();

    if (ownerId !== req.user._id.toString() && !trip.isPublic) {
      return res.status(403).json({
        message: "Not allowed",
      });
    }

    res.json(trip);
  } catch (err) {
    console.error("GET TRIP ERROR:", err);

    res.status(500).json({
      message: "Load trip failed",
    });
  }
});

// =====================================================
// ================= UPDATE TRIP =======================
// =====================================================

router.put(
  "/:id",
  protect,
  uploadTrips.array("tripImages", 10),
  async (req, res) => {
    try {
      const trip = await Trip.findOne({
        _id: req.params.id,
        userId: req.user._id,
      });

      if (!trip) {
        return res.status(404).json({
          message: "Trip not found",
        });
      }

      const {
        tripName,
        startDate,
        endDate,
        startLocation,
        description,
        isPublic,
        tripPlaces,
        tripFestivals,
      } = req.body;

      if (tripName !== undefined) trip.tripName = tripName;
      if (startDate !== undefined) trip.startDate = startDate;
      if (endDate !== undefined) trip.endDate = endDate;
      if (startLocation !== undefined) trip.startLocation = startLocation;
      if (description !== undefined) trip.description = description;

      if (isPublic !== undefined) {
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
// ================= DELETE TRIP =======================
// =====================================================

router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedTrip = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

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
// ================= SHARE TRIP ========================
// =====================================================

router.put("/:id/share", protect, async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        isPublic: true,
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
    console.error("SHARE TRIP ERROR:", err);

    res.status(500).json({
      message: "Share trip failed",
    });
  }
});

// =====================================================
// ================= PRIVATE TRIP ======================
// =====================================================

router.put("/:id/private", protect, async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      {
        isPublic: false,
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
    console.error("PRIVATE TRIP ERROR:", err);

    res.status(500).json({
      message: "Private trip failed",
    });
  }
});

// =====================================================
// ================= SAVE PUBLIC TRIP ==================
// =====================================================

router.post("/:id/save", protect, async (req, res) => {
  try {
    const sourceTrip = await Trip.findById(req.params.id);

    if (!sourceTrip || !sourceTrip.isPublic) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (sourceTrip.userId.equals(req.user._id)) {
      return res.status(400).json({
        message: "Cannot save your own trip",
      });
    }

    const clonedTrip = await Trip.create({
      userId: req.user._id,
      tripName: sourceTrip.tripName,
      startDate: sourceTrip.startDate,
      endDate: sourceTrip.endDate,
      startLocation: sourceTrip.startLocation,
      description: sourceTrip.description,
      tripImages: sourceTrip.tripImages,
      tripPlaces: sourceTrip.tripPlaces.map((item) => ({
        placeId: item.placeId,
        sequenceNo: item.sequenceNo,
        visitDate: item.visitDate || null,
      })),
      tripFestivals: sourceTrip.tripFestivals.map((item) => ({
        festivalId: item.festivalId,
        attendDate: item.attendDate || null,
      })),
      isPublic: false,
    });

    const populatedTrip = await Trip.findById(clonedTrip._id)
      .populate(TRIP_POPULATE)
      .lean();

    res.status(201).json(populatedTrip);
  } catch (err) {
    console.error("SAVE TRIP ERROR:", err);

    res.status(500).json({
      message: "Save trip failed",
    });
  }
});

// =====================================================
// ================= ADD PLACE TO TRIP =================
// =====================================================

router.post("/:tripId/add-place", protect, async (req, res) => {
  try {
    const { placeId, visitDate } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      userId: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const alreadyExists = trip.tripPlaces.some(
      (item) => item.placeId.toString() === placeId
    );

    if (alreadyExists) {
      return res.status(400).json({
        message: "Place already exists in trip",
      });
    }

    const maxSequence =
      trip.tripPlaces.length > 0
        ? Math.max(...trip.tripPlaces.map((item) => item.sequenceNo))
        : 0;

    trip.tripPlaces.push({
      placeId,
      sequenceNo: maxSequence + 1,
      visitDate: visitDate || null,
    });

    await trip.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate(TRIP_POPULATE)
      .lean();

    res.json(updatedTrip);
  } catch (err) {
    console.error("ADD PLACE ERROR:", err);

    res.status(500).json({
      message: "Add place failed",
    });
  }
});

// =====================================================
// ================= ADD FESTIVAL TO TRIP ==============
// =====================================================

router.post("/:tripId/add-festival", protect, async (req, res) => {
  try {
    const { festivalId, attendDate } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      userId: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const alreadyExists = trip.tripFestivals.some(
      (item) => item.festivalId.toString() === festivalId
    );

    if (alreadyExists) {
      return res.status(400).json({
        message: "Festival already exists in trip",
      });
    }

    trip.tripFestivals.push({
      festivalId,
      attendDate: attendDate || null,
    });

    await trip.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate(TRIP_POPULATE)
      .lean();

    res.json(updatedTrip);
  } catch (err) {
    console.error("ADD FESTIVAL ERROR:", err);

    res.status(500).json({
      message: "Add festival failed",
    });
  }
});

module.exports = router;
