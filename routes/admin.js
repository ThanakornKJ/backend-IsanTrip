const express = require("express");
const router = express.Router();

const User = require("../models/User");
const TouristPlace = require("../models/TouristPlace");
const Trip = require("../models/Trip");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { uploadPlaces, uploadTrips } = require("../middleware/upload");


// =====================================================
// ================= CREATE PLACE ======================
// =====================================================
router.post(
  "/places",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 10),
  async (req, res) => {
    try {

      const {
        name,
        type,
        category,
        province,
        description,
        openingHours,
        contact,
        price,
        latitude,
        longitude,
      } = req.body;

      const imagePaths = req.files?.map((file, index) => ({
        imageURL: `/uploads/places/${file.filename}`,
        isCover: index === 0,
      })) || [];

      const newPlace = new TouristPlace({
        placeName: name,
        touristType: type ? type.split(",") : [],
        category: category,
        province: province,
        description: description,
        openingHours: openingHours,
        contact: contact,
        entranceFee: price, // 🔥 เปลี่ยนตรงนี้
        latitude: latitude ? Number(latitude) : 0,
        longitude: longitude ? Number(longitude) : 0,
        placeImages: imagePaths,
      });

      await newPlace.save();

      res.status(201).json({ message: "เพิ่มสถานที่สำเร็จ" });

    } catch (err) {
      console.error("CREATE PLACE ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// =====================================================
// ================= GET ALL PLACES ====================
// =====================================================
router.get(
  "/places",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const places = await TouristPlace.find().lean();

      const formatted = places.map((p) => ({
        _id: p._id,
        name: p.placeName,
        province: p.province,
        type: p.touristType,
        category: p.category,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        openingHours: p.openingHours,
        image:
          p.placeImages && p.placeImages.length > 0
            ? p.placeImages.find((img) => img.isCover)?.imageURL ||
              p.placeImages[0].imageURL
            : null,
      }));

      res.json(formatted);

    } catch (err) {
      console.error("GET PLACES ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// =====================================================
// ================= UPDATE PLACE ======================
// =====================================================
router.put(
  "/places/:id",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 10),
  async (req, res) => {
    try {

      const { id } = req.params;

      const place = await TouristPlace.findById(id);

      if (!place) {
        return res.status(404).json({ message: "ไม่พบสถานที่" });
      }

      const {
        name,
        type,
        category,
        province,
        description,
        openingHours,
        contact,
        price,
        latitude,
        longitude,
      } = req.body;

      place.placeName = name ?? place.placeName;
      if (type) {
        place.touristType = type.split(",");
      } else if (touristType) {
        place.touristType = touristType.split(",");
      }
      place.category = category ?? place.category;
      place.province = province ?? place.province;
      place.description = description ?? place.description;
      place.openingHours = openingHours ?? place.openingHours;
      place.contact = contact ?? place.contact;
      place.entranceFee = price ?? place.entranceFee;
      place.latitude = latitude ? Number(latitude) : place.latitude;
      place.longitude = longitude ? Number(longitude) : place.longitude;

      if (req.files && req.files.length > 0) {

        const imagePaths = req.files.map((file, index) => ({
          imageURL: `/uploads/places/${file.filename}`,
          isCover: index === 0,
        }));

        place.placeImages = imagePaths;
      }

      await place.save();

      res.json({ message: "แก้ไขสำเร็จ" });

    } catch (err) {
      console.error("UPDATE ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// =====================================================
// ================= DELETE PLACE ======================
// =====================================================
router.delete(
  "/places/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const place = await TouristPlace.findById(req.params.id);

      if (!place) {
        return res.status(404).json({ message: "ไม่พบสถานที่" });
      }

      await place.deleteOne();

      res.json({ message: "ลบสำเร็จ" });

    } catch (err) {
      console.error("DELETE ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// =====================================================
// ================= ADMIN STATS =======================
// =====================================================
router.get(
  "/stats",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const totalUsers = await User.countDocuments();
      const totalPlaces = await TouristPlace.countDocuments();
      const totalTrips = await Trip.countDocuments();

      res.json({
        totalUsers,
        totalPlaces,
        totalTrips,
      });

    } catch (err) {
      console.error("STATS ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);


// =====================================================
// ================= UPDATE TRIP (ADMIN) ===============
// =====================================================
router.put(
  "/trips/:id",
  protect,
  authorize("admin"),
  uploadTrips.array("tripImages", 10),
  async (req, res) => {
    try {

      const { tripName, startDate, endDate, description, tripPlaces, startLocation } = req.body;

      let sortedPlaces = [];

      if (tripPlaces) {

        const parsed =
          typeof tripPlaces === "string"
            ? JSON.parse(tripPlaces)
            : tripPlaces;

        sortedPlaces = parsed
          .map(p => ({
            placeId: p.placeId,
            sequenceNo: p.sequenceNo
          }))
          .sort((a, b) => a.sequenceNo - b.sequenceNo);
      }

      const updateData = {};

      if (tripName) updateData.tripName = tripName;
      if (startDate) updateData.startDate = startDate;
      if (endDate) updateData.endDate = endDate;
      if (startLocation) updateData.startLocation = startLocation;
      if (description) updateData.description = description;
      if (sortedPlaces.length > 0) updateData.tripPlaces = sortedPlaces;

      if (req.files && req.files.length > 0) {

        const imagePaths = req.files.map(
          (file) => `/uploads/trips/${file.filename}`
        );

        updateData.images = imagePaths;
      }

      const updatedTrip = await Trip.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          returnDocument: "after",
          runValidators: true
        }
      ).populate("tripPlaces.placeId");

      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(updatedTrip);

    } catch (err) {
      console.error("ADMIN UPDATE TRIP ERROR:", err);
      res.status(500).json({ message: "Update trip failed" });
    }
  }
);

// =====================================================
// ================= GET ALL TRIPS (ADMIN) ==============
// =====================================================
router.get(
  "/trips",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const trips = await Trip.find()
        .populate("tripPlaces.placeId")
        .populate("userId", "fullName profileImage email")
        .sort({ createdAt: -1 })
        .lean();

      res.json(trips);

    } catch (err) {
      console.error("GET ADMIN TRIPS ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// =====================================================
// ================= GET TRIP BY ID (ADMIN) =============
// =====================================================
router.get(
  "/trips/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const trip = await Trip.findById(req.params.id)
        .populate("tripPlaces.placeId")
        .populate("userId", "fullName email profileImage");

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(trip);

    } catch (err) {
      console.error("GET TRIP ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// =====================================================
// ================= DELETE TRIP (ADMIN) ===============
// =====================================================
router.delete(
  "/trips/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      await trip.deleteOne();

      res.json({ message: "Trip deleted successfully" });

    } catch (err) {
      console.error("ADMIN DELETE TRIP ERROR:", err);
      res.status(500).json({ message: "Delete trip failed" });
    }
  }
);

// =====================================================
// ================= UPDATE TRIP STATUS =================
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
        { isPublic },
        { new: true }
      ).populate("userId", "fullName profileImage");

      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(trip);

    } catch (err) {
      console.error("UPDATE TRIP STATUS ERROR:", err);
      res.status(500).json({ message: "Update status failed" });
    }
  }
);

// =====================================================
// ================= GET ALL USERS =====================
// =====================================================
router.get(
  "/users",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .lean();

      const formatted = users.map((u) => ({
        _id: u._id,
        name: u.fullName,
        email: u.email,
        userType: u.userType,
      }));

      res.json(formatted);

    } catch (err) {
      console.error("GET USERS ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// =====================================================
// ================= DELETE USER =======================
// =====================================================
router.delete(
  "/users/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้" });
      }
      await user.deleteOne();
      res.json({ message: "ลบผู้ใช้สำเร็จ" });
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ================= UPDATE USER =================
router.put(
  "/users/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { fullName, email, password } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (fullName) user.fullName = fullName;
      if (email) user.email = email;
      if (password) {
        const bcrypt = require("bcryptjs");
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
      }
      await user.save();
      res.json({ message: "User updated" });
    } catch (err) {
      console.error("UPDATE USER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;