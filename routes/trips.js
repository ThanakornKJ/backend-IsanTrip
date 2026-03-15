const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const { uploadTrips } = require("../middleware/upload");
// ================= MULTER CONFIG =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/trips/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});


/// ================= CREATE TRIP =================
router.post(
  "/create",
  protect,
  uploadTrips.array("tripImages", 10),
  async (req, res) => {
    try {
      const { tripName, startDate, endDate, description, tripPlaces, startLocation } = req.body;
      if (!tripName || !startDate || !endDate) {
        return res.status(400).json({
          message: "tripName, startDate และ endDate จำเป็นต้องกรอก",
        });
      }
      let sortedPlaces = [];
      if (tripPlaces) {
        const parsedPlaces = JSON.parse(tripPlaces);
        sortedPlaces = parsedPlaces
          .map((p) => ({
            placeId: p.placeId,
            sequenceNo: p.sequenceNo
          }))
          .sort((a, b) => a.sequenceNo - b.sequenceNo);
      }
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        imageUrls = req.files.map((file) => {
          return `${req.protocol}://${req.get("host")}/uploads/trips/${file.filename}`;
        });
      }
      const trip = await Trip.create({
        userId: req.user._id,
        tripName,
        startDate,
        endDate,
        startLocation,
        description,
        images: imageUrls,
        tripPlaces: sortedPlaces,
      });
      const populatedTrip = await Trip.findById(trip._id)
        .populate("tripPlaces.placeId");
      res.status(201).json(populatedTrip);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Create trip failed" });
    }
  }
);


/// ================= GET MY TRIPS =================
router.get("/my-trips", protect, async (req, res) => {
  try {
    const trips = await Trip.find({ userId: req.user._id })
      .populate("tripPlaces.placeId")
      .sort({ createdAt: -1 }); // ✅ ใช้ createdAt (ถ้า model เปิด timestamps)

    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Load trips failed" });
  }
});

/// ================= PUBLIC TRIPS =================
router.get("/public", async (req, res) => {
  try {

    const trips = await Trip.find({ isPublic: true })
      .populate("tripPlaces.placeId")
      .populate("userId", "fullName profileImage")
      .sort({ createdAt: -1 });

    res.json(trips);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Load public trips failed" });
  }
});

/// ================= GET SINGLE TRIP =================
router.get("/:id", protect, async (req, res) => {
  try {

    const trip = await Trip.findById(req.params.id)
      .populate("tripPlaces.placeId");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // 🔥 ถ้าไม่ใช่เจ้าของ ต้องเป็น public
    if (!trip.userId.equals(req.user._id) && !trip.isPublic) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(trip);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Load trip failed" });
  }
});


/// ================= UPDATE TRIP =================
router.put("/:id", protect, uploadTrips.array("tripImages", 10), async (req, res) => {
  try {
    const { tripName, startDate, endDate, description, tripPlaces, startLocation } = req.body;

    let sortedPlaces = [];

    if (tripPlaces) {

      let parsedPlaces = tripPlaces;

      if (typeof tripPlaces === "string") {
        parsedPlaces = JSON.parse(tripPlaces);
      }

      sortedPlaces = parsedPlaces
        .map((p) => ({
          placeId: p.placeId,
          sequenceNo: p.sequenceNo,
          visitDate: p.visitDate || null
        }))
        .sort((a, b) => a.sequenceNo - b.sequenceNo);
    }

    const updateData = {
      tripName,
      startDate,
      endDate,
      startLocation,
      description,
      tripPlaces: sortedPlaces
    };

    if (req.files && req.files.length > 0) {
      const imageUrls = req.files.map((file) => {
        return `${req.protocol}://${req.get("host")}/uploads/trips/${file.filename}`;
      });

      updateData.images = imageUrls;
    }

    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true }
    ).populate("tripPlaces.placeId");

    if (!updatedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(updatedTrip);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update trip failed" });
  }
});


/// ================= DELETE TRIP =================
router.delete("/:id", protect, async (req, res) => {
  try {
    const deletedTrip = await Trip.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deletedTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete trip failed" });
  }
});

/// ================= SHARE TRIP =================
router.put("/:id/share", protect, async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isPublic: true },
      { new: true }
    );
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Share trip failed" });
  }
});


/// ================= MAKE PRIVATE =================
router.put("/:id/private", protect, async (req, res) => {
  try {

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isPublic: false },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Private trip failed" });
  }
});

/// ================= SAVE TRIP FROM FEED =================
router.post("/:id/save", protect, async (req, res) => {
  try {

    const sourceTrip = await Trip.findById(req.params.id);

    if (!sourceTrip || !sourceTrip.isPublic) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ❌ ห้ามบันทึกทริปตัวเอง
    if (sourceTrip.userId.equals(req.user._id)) {
      return res.status(400).json({
        message: "Cannot save your own trip"
      });
    }

    const newTrip = await Trip.create({
      userId: req.user._id,
      tripName: sourceTrip.tripName,
      startDate: sourceTrip.startDate,
      endDate: sourceTrip.endDate,
      startLocation: sourceTrip.startLocation,
      description: sourceTrip.description,
      images: sourceTrip.images,
      tripPlaces: sourceTrip.tripPlaces,
      isPublic: false
    });

    const populatedTrip = await Trip.findById(newTrip._id)
      .populate("tripPlaces.placeId");

    res.status(201).json(populatedTrip);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Save trip failed" });
  }
});

/// ================= ADD PLACE TO TRIP =================
router.post("/:tripId/add-place", protect, async (req, res) => {
  try {

    const { placeId } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.tripId,
      userId: req.user._id
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // ตรวจว่ามีสถานที่นี้อยู่แล้วหรือไม่
    const exists = trip.tripPlaces.some(
      (p) => p.placeId.toString() === placeId
    );

    if (exists) {
      return res.status(400).json({
        message: "Place already exists in this trip"
      });
    }

    // หา sequenceNo ล่าสุด
    const lastSeq =
      trip.tripPlaces.length > 0
        ? Math.max(...trip.tripPlaces.map((p) => p.sequenceNo))
        : 0;

    trip.tripPlaces.push({
      placeId,
      sequenceNo: lastSeq + 1
    });

    await trip.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate("tripPlaces.placeId");

    res.json(updatedTrip);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Add place failed" });
  }
});

module.exports = router;