const express = require("express");
const TouristPlace = require("../models/TouristPlace");
const Province    = require("../models/Province");
const Category    = require("../models/Category");
const PlaceType   = require("../models/PlaceType");
const protect     = require("../middleware/authMiddleware");
const authorize   = require("../middleware/roleMiddleware");
const { uploadPlaces } = require("../middleware/upload");
const router = express.Router();

// ================= SEARCH =================
router.get("/search", protect, async (req, res) => {
  try {
    const { keyword, province } = req.query;
    let filter = {};

    if (province && province !== "ทุกจังหวัด") {
      const prov = await Province.findOne({ name: province });
      if (prov) filter.provinceId = prov._id;
    }

    if (keyword) {
      filter.$or = [
        { placeName:   { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    const places = await TouristPlace.find(filter)
      .populate("provinceId", "name")
      .populate("categoryId", "name")
      .populate("typeId", "name");

    res.json(places);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET ALL =================
router.get("/", protect, async (req, res) => {
  try {
    const { province } = req.query;
    let filter = {};

    if (province && province !== "ทุกจังหวัด") {
      const prov = await Province.findOne({ name: province });
      if (prov) filter.provinceId = prov._id;
    }

    const places = await TouristPlace.find(filter)
      .populate("provinceId", "name")
      .populate("categoryId", "name")
      .populate("typeId", "name");

    res.json(places);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET BY ID =================
router.get("/:id", protect, async (req, res) => {
  try {
    const place = await TouristPlace.findById(req.params.id)
      .populate("provinceId", "name")
      .populate("categoryId", "name")
      .populate("typeId", "name");

    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }
    res.json(place);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= CREATE (ADMIN) =================
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 5),
  async (req, res) => {
    try {
      const {
        placeName, description, address,
        province, category, touristType,
        openingHours, contact, entranceFee,
        latitude, longitude,
        socialMedia, highlight, travelInfo,
      } = req.body;

      if (!placeName) {
        return res.status(400).json({ message: "placeName จำเป็นต้องกรอก" });
      }

      // Resolve ObjectIds
      const [provDoc, catDoc, typeDoc] = await Promise.all([
        province   ? Province.findOne({ name: province })  : null,
        category   ? Category.findOne({ name: category })  : null,
        touristType? PlaceType.findOne({ name: touristType }): null,
      ]);

      let placeImages = req.files?.map((file, i) => ({
        imageURL: `uploads/places/${file.filename}`,
        isCover: i === 0,
      })) || [];

      const newPlace = await TouristPlace.create({
        placeName, description, address,
        provinceId:  provDoc?._id,
        categoryId:  catDoc?._id,
        typeId:      typeDoc?._id,
        openingHours, contact, entranceFee,
        latitude:  latitude  ? Number(latitude)  : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        socialMedia, highlight, travelInfo,
        placeImages,
      });

      res.status(201).json(newPlace);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= UPDATE (ADMIN) =================
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 5),
  async (req, res) => {
    try {
      const {
        placeName, description, address,
        province, category, touristType,
        openingHours, contact, entranceFee,
        latitude, longitude,
        socialMedia, highlight, travelInfo,
      } = req.body;

      const [provDoc, catDoc, typeDoc] = await Promise.all([
        province    ? Province.findOne({ name: province })   : null,
        category    ? Category.findOne({ name: category })   : null,
        touristType ? PlaceType.findOne({ name: touristType }): null,
      ]);

      const updateData = {
        ...(placeName    && { placeName }),
        ...(description  && { description }),
        ...(address      && { address }),
        ...(provDoc      && { provinceId: provDoc._id }),
        ...(catDoc       && { categoryId: catDoc._id }),
        ...(typeDoc      && { typeId: typeDoc._id }),
        ...(openingHours && { openingHours }),
        ...(contact      && { contact }),
        ...(entranceFee  && { entranceFee }),
        ...(latitude     && { latitude: Number(latitude) }),
        ...(longitude    && { longitude: Number(longitude) }),
        ...(socialMedia  && { socialMedia }),
        ...(highlight    && { highlight }),
        ...(travelInfo   && { travelInfo }),
      };

      if (req.files?.length > 0) {
        updateData.placeImages = req.files.map((file, i) => ({
          imageURL: `uploads/places/${file.filename}`,
          isCover: i === 0,
        }));
      }

      const updated = await TouristPlace.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      )
        .populate("provinceId", "name")
        .populate("categoryId", "name")
        .populate("typeId", "name");

      if (!updated) {
        return res.status(404).json({ message: "Place not found" });
      }

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= DELETE (ADMIN) =================
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deleted = await TouristPlace.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Place not found" });
    }
    res.json({ message: "Place deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= GET BY CATEGORY =================
router.get("/category/:category", async (req, res) => {
  try {
    const catDoc = await Category.findOne({ name: req.params.category });
    if (!catDoc) return res.json([]);

    const places = await TouristPlace.find({ categoryId: catDoc._id })
      .populate("provinceId", "name")
      .lean();

    res.json(places);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;