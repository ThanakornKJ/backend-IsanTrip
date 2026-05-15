const express = require("express");
const router = express.Router();

const TouristPlace = require("../models/TouristPlace");
const Province = require("../models/Province");
const Category = require("../models/Category");
const PlaceType = require("../models/PlaceType");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { uploadPlaces } = require("../middleware/upload");


// =====================================================
// ================= SEARCH PLACE ======================
// =====================================================
router.get("/search", protect, async (req, res) => {
  try {
    const {
      keyword,
      province,
      category,
      type,
    } = req.query;

    const filter = {};

    // Province filter
    if (province && province !== "ทุกจังหวัด") {
      const provinceDoc = await Province.findOne({
        name: province,
      });

      if (provinceDoc) {
        filter.provinceId = provinceDoc._id;
      }
    }

    // Category filter
    if (category) {
      const categoryDoc = await Category.findOne({
        name: category,
      });

      if (categoryDoc) {
        filter.categoryId = categoryDoc._id;
      }
    }

    // Place Type filter
    if (type) {
      const typeDoc = await PlaceType.findOne({
        name: type,
      });

      if (typeDoc) {
        filter.typeId = typeDoc._id;
      }
    }

    // Keyword search
    if (keyword) {
      filter.$or = [
        {
          placeName: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          address: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    const places = await TouristPlace.find(filter)
      .populate("provinceId", "name")
      .populate("categoryId", "name")
      .populate("typeId", "name")
      .sort({ createdAt: -1 });

    res.json(places);

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
    const {
      province,
      category,
      type,
    } = req.query;

    const filter = {};

    // Province
    if (province && province !== "ทุกจังหวัด") {
      const provinceDoc = await Province.findOne({
        name: province,
      });

      if (provinceDoc) {
        filter.provinceId = provinceDoc._id;
      }
    }

    // Category
    if (category) {
      const categoryDoc = await Category.findOne({
        name: category,
      });

      if (categoryDoc) {
        filter.categoryId = categoryDoc._id;
      }
    }

    // Type
    if (type) {
      const typeDoc = await PlaceType.findOne({
        name: type,
      });

      if (typeDoc) {
        filter.typeId = typeDoc._id;
      }
    }

    const places = await TouristPlace.find(filter)
      .populate("provinceId", "name")
      .populate("categoryId", "name")
      .populate("typeId", "name")
      .sort({ createdAt: -1 });

    res.json(places);

  } catch (err) {
    console.error("GET ALL PLACE ERROR:", err);
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

    const place = await TouristPlace.findById(
      req.params.id
    )
      .populate("provinceId", "name")
      .populate("categoryId", "name")
      .populate("typeId", "name");

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
// ================= CREATE PLACE ======================
// =====================================================
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadPlaces.array("images", 10),
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

      // Resolve refs
      const [
        provinceDoc,
        categoryDoc,
        typeDoc,
      ] = await Promise.all([
        province
          ? Province.findOne({
              name: province,
            })
          : null,

        category
          ? Category.findOne({
              name: category,
            })
          : null,

        touristType
          ? PlaceType.findOne({
              name: touristType,
            })
          : null,
      ]);

      // Images
      const placeImages =
        req.files?.map((file, index) => ({
          imageURL: `uploads/places/${file.filename}`,
          isCover: index === 0,
        })) || [];

      const lat = latitude
        ? Number(latitude)
        : 0;

      const lng = longitude
        ? Number(longitude)
        : 0;

      const newPlace =
        await TouristPlace.create({
          placeName,
          description,
          address,

          provinceId:
            provinceDoc?._id,

          categoryId:
            categoryDoc?._id,

          typeId:
            typeDoc?._id,

          openingHours,
          contact,
          entranceFee,
          socialMedia,
          highlight,
          travelInfo,

          latitude: lat,
          longitude: lng,

          location: {
            type: "Point",
            coordinates: [lng, lat],
          },

          placeImages,
        });

      const populated =
        await TouristPlace.findById(
          newPlace._id
        )
          .populate(
            "provinceId",
            "name"
          )
          .populate(
            "categoryId",
            "name"
          )
          .populate(
            "typeId",
            "name"
          );

      res.status(201).json(
        populated
      );

    } catch (err) {
      console.error(
        "CREATE PLACE ERROR:",
        err
      );

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
  uploadPlaces.array("images", 10),
  async (req, res) => {
    try {

      const place =
        await TouristPlace.findById(
          req.params.id
        );

      if (!place) {
        return res.status(404).json({
          message:
            "Place not found",
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

      const [
        provinceDoc,
        categoryDoc,
        typeDoc,
      ] = await Promise.all([
        province
          ? Province.findOne({
              name: province,
            })
          : null,

        category
          ? Category.findOne({
              name: category,
            })
          : null,

        touristType
          ? PlaceType.findOne({
              name: touristType,
            })
          : null,
      ]);

      if (placeName)
        place.placeName =
          placeName;

      if (description)
        place.description =
          description;

      if (address)
        place.address =
          address;

      if (provinceDoc)
        place.provinceId =
          provinceDoc._id;

      if (categoryDoc)
        place.categoryId =
          categoryDoc._id;

      if (typeDoc)
        place.typeId =
          typeDoc._id;

      if (openingHours)
        place.openingHours =
          openingHours;

      if (contact)
        place.contact =
          contact;

      if (entranceFee)
        place.entranceFee =
          entranceFee;

      if (socialMedia)
        place.socialMedia =
          socialMedia;

      if (highlight)
        place.highlight =
          highlight;

      if (travelInfo)
        place.travelInfo =
          travelInfo;

      // Update location
      if (
        latitude !== undefined &&
        longitude !== undefined
      ) {
        const lat =
          Number(latitude);

        const lng =
          Number(longitude);

        place.latitude = lat;
        place.longitude = lng;

        place.location = {
          type: "Point",
          coordinates: [
            lng,
            lat,
          ],
        };
      }

      // Replace images
      if (
        req.files &&
        req.files.length > 0
      ) {
        place.placeImages =
          req.files.map(
            (
              file,
              index
            ) => ({
              imageURL:
                `uploads/places/${file.filename}`,
              isCover:
                index === 0,
            })
          );
      }

      await place.save();

      const populated =
        await TouristPlace.findById(
          place._id
        )
          .populate(
            "provinceId",
            "name"
          )
          .populate(
            "categoryId",
            "name"
          )
          .populate(
            "typeId",
            "name"
          );

      res.json(populated);

    } catch (err) {
      console.error(
        "UPDATE PLACE ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);


// =====================================================
// ================= DELETE PLACE ======================
// =====================================================
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {

      const deleted =
        await TouristPlace.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          message:
            "Place not found",
        });
      }

      res.json({
        message:
          "Place deleted successfully",
      });

    } catch (err) {
      console.error(
        "DELETE PLACE ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);


// =====================================================
// ============= GET PLACE BY CATEGORY =================
// =====================================================
router.get(
  "/category/:category",
  async (req, res) => {
    try {

      const categoryDoc =
        await Category.findOne({
          name:
            req.params.category,
        });

      if (!categoryDoc) {
        return res.json([]);
      }

      const places =
        await TouristPlace.find({
          categoryId:
            categoryDoc._id,
        })
          .populate(
            "provinceId",
            "name"
          )
          .populate(
            "categoryId",
            "name"
          )
          .populate(
            "typeId",
            "name"
          );

      res.json(places);

    } catch (err) {
      console.error(
        "CATEGORY PLACE ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

module.exports = router;