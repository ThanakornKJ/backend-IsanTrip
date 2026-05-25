const express = require("express");
const router = express.Router();

const TouristPlace = require("../models/TouristPlace");
const Province = require("../models/Province");
const Category = require("../models/Category");
const PlaceType = require("../models/PlaceType");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  uploadPlaces,
} = require("../middleware/upload");

// =====================================================
// ================= POPULATE CONFIG ===================
// =====================================================
const PLACE_POPULATE = [
  {
    path: "provinceId",
    select: "name",
  },
  {
    path: "categoryId",
    select: "name",
  },
  {
    path: "typeId",
    select: "name",
  },
];

// =====================================================
// ================= FORMAT PLACE ======================
// =====================================================
const formatPlace = (place) => {
  const coverImage =
    place.placeImages?.find(
      (img) => img.isCover
    ) || place.placeImages?.[0];

  return {
    _id: place._id,

    placeName: place.placeName,

    description:
      place.description,

    address: place.address,

    provinceId:
      place.provinceId,

    categoryId:
      place.categoryId,

    typeId:
      place.typeId,

    province:
      place.provinceId?.name ||
      "",

    category:
      place.categoryId?.name ||
      "",

    touristType:
      place.typeId?.name ||
      "",

    latitude:
      place.latitude,

    longitude:
      place.longitude,

    location:
      place.location,

    openingHours:
      place.openingHours,

    contact:
      place.contact,

    entranceFee:
      place.entranceFee,

    socialMedia:
      place.socialMedia,

    highlight:
      place.highlight,

    travelInfo:
      place.travelInfo,

    placeImages:
      place.placeImages || [],

    coverImage:
      coverImage?.imageURL ||
      null,

    createdAt:
      place.createdAt,

    updatedAt:
      place.updatedAt,
  };
};

// =====================================================
// ================= BUILD FILTER ======================
// =====================================================
const buildPlaceFilter =
  async (query) => {

    const {
      keyword,
      province,
      category,
      type,
    } = query;

    const filter = {};

    // ================= PROVINCE =================
    if (
      province &&
      province !== "ทุกจังหวัด"
    ) {
      const provinceDoc =
        await Province.findOne({
          name: province,
        });

      if (provinceDoc) {
        filter.provinceId =
          provinceDoc._id;
      }
    }

    // ================= CATEGORY =================
    if (category) {
      const categoryDoc =
        await Category.findOne({
          name: category,
        });

      if (categoryDoc) {
        filter.categoryId =
          categoryDoc._id;
      }
    }

    // ================= TYPE =================
    if (type) {
      const typeDoc =
        await PlaceType.findOne({
          name: type,
        });

      if (typeDoc) {
        filter.typeId =
          typeDoc._id;
      }
    }

    // ================= KEYWORD =================
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
        {
          highlight: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    return filter;
  };

// =====================================================
// ================= SEARCH PLACE ======================
// =====================================================
router.get(
  "/search",
  protect,

  async (req, res) => {
    try {

      const filter =
        await buildPlaceFilter(
          req.query
        );

      const places =
        await TouristPlace.find(
          filter
        )
          .populate(
            PLACE_POPULATE
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const formatted =
        places.map(
          formatPlace
        );

      res.json(
        formatted
      );

    } catch (err) {

      console.error(
        "SEARCH PLACE ERROR:",
        err
      );

      res.status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= GET ALL PLACES ====================
// =====================================================
router.get(
  "/",
  protect,

  async (req, res) => {
    try {

      const filter =
        await buildPlaceFilter(
          req.query
        );

      const places =
        await TouristPlace.find(
          filter
        )
          .populate(
            PLACE_POPULATE
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const formatted =
        places.map(
          formatPlace
        );

      res.json(
        formatted
      );

    } catch (err) {

      console.error(
        "GET ALL PLACE ERROR:",
        err
      );

      res.status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= GET PLACE BY ID ===================
// =====================================================
router.get(
  "/:id",
  protect,

  async (req, res) => {
    try {

      const place =
        await TouristPlace.findById(
          req.params.id
        )
          .populate(
            PLACE_POPULATE
          )
          .lean();

      if (!place) {
        return res
          .status(404)
          .json({
            message:
              "Place not found",
          });
      }

      res.json(
        formatPlace(place)
      );

    } catch (err) {

      console.error(
        "GET PLACE ERROR:",
        err
      );

      res.status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= CREATE PLACE ======================
// =====================================================
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadPlaces.array(
    "placeImages",
    10
  ),

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

      // ================= VALIDATION =================
      if (!placeName) {
        return res
          .status(400)
          .json({
            message:
              "placeName is required",
          });
      }

      // ================= RESOLVE RELATIONS =================
      const [
        provinceDoc,
        categoryDoc,
        typeDoc,
      ] =
        await Promise.all([
          province
            ? Province.findOne({
                name:
                  province,
              })
            : null,

          category
            ? Category.findOne({
                name:
                  category,
              })
            : null,

          touristType
            ? PlaceType.findOne({
                name:
                  touristType,
              })
            : null,
        ]);

      // ================= IMAGES =================
      const placeImages =
        req.files?.map(
          (
            file,
            index
          ) => ({
            imageURL:
              `/uploads/places/${file.filename}`,

            isCover:
              index === 0,
          })
        ) || [];

      // ================= LOCATION =================
      const lat =
        latitude !==
          undefined
          ? Number(
              latitude
            )
          : 0;

      const lng =
        longitude !==
          undefined
          ? Number(
              longitude
            )
          : 0;

      const newPlace =
        await TouristPlace.create(
          {
            placeName,
            description,
            address,

            provinceId:
              provinceDoc?._id,

            categoryId:
              categoryDoc?._id,

            typeId:
              typeDoc?._id,

            latitude: lat,
            longitude: lng,

            location: {
              type: "Point",
              coordinates: [
                lng,
                lat,
              ],
            },

            openingHours,
            contact,
            entranceFee,

            socialMedia,
            highlight,
            travelInfo,

            placeImages,
          }
        );

      const populated =
        await TouristPlace.findById(
          newPlace._id
        )
          .populate(
            PLACE_POPULATE
          )
          .lean();

      res
        .status(201)
        .json(
          formatPlace(
            populated
          )
        );

    } catch (err) {

      console.error(
        "CREATE PLACE ERROR:",
        err
      );

      // duplicate key
      if (
        err.code === 11000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Place name already exists",
          });
      }

      res.status(500)
        .json({
          message:
            "Server error",
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
  uploadPlaces.array(
    "placeImages",
    10
  ),

  async (req, res) => {
    try {

      const place =
        await TouristPlace.findById(
          req.params.id
        );

      if (!place) {
        return res
          .status(404)
          .json({
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

      // ================= RESOLVE RELATIONS =================
      const [
        provinceDoc,
        categoryDoc,
        typeDoc,
      ] =
        await Promise.all([
          province
            ? Province.findOne({
                name:
                  province,
              })
            : null,

          category
            ? Category.findOne({
                name:
                  category,
              })
            : null,

          touristType
            ? PlaceType.findOne({
                name:
                  touristType,
              })
            : null,
        ]);

      // ================= BASIC FIELDS =================
      if (
        placeName !==
        undefined
      ) {
        place.placeName =
          placeName;
      }

      if (
        description !==
        undefined
      ) {
        place.description =
          description;
      }

      if (
        address !==
        undefined
      ) {
        place.address =
          address;
      }

      if (
        openingHours !==
        undefined
      ) {
        place.openingHours =
          openingHours;
      }

      if (
        contact !==
        undefined
      ) {
        place.contact =
          contact;
      }

      if (
        entranceFee !==
        undefined
      ) {
        place.entranceFee =
          entranceFee;
      }

      if (
        socialMedia !==
        undefined
      ) {
        place.socialMedia =
          socialMedia;
      }

      if (
        highlight !==
        undefined
      ) {
        place.highlight =
          highlight;
      }

      if (
        travelInfo !==
        undefined
      ) {
        place.travelInfo =
          travelInfo;
      }

      // ================= RELATIONS =================
      if (
        provinceDoc
      ) {
        place.provinceId =
          provinceDoc._id;
      }

      if (
        categoryDoc
      ) {
        place.categoryId =
          categoryDoc._id;
      }

      if (
        typeDoc
      ) {
        place.typeId =
          typeDoc._id;
      }

      // ================= LOCATION =================
      if (
        latitude !==
        undefined
      ) {
        place.latitude =
          Number(
            latitude
          );
      }

      if (
        longitude !==
        undefined
      ) {
        place.longitude =
          Number(
            longitude
          );
      }

      place.location = {
        type: "Point",
        coordinates: [
          place.longitude || 0,
          place.latitude || 0,
        ],
      };

      // ================= IMAGES =================
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
                `/uploads/places/${file.filename}`,

              isCover:
                index === 0,
            })
          );
      }

      await place.save();

      const updatedPlace =
        await TouristPlace.findById(
          place._id
        )
          .populate(
            PLACE_POPULATE
          )
          .lean();

      res.json(
        formatPlace(
          updatedPlace
        )
      );

    } catch (err) {

      console.error(
        "UPDATE PLACE ERROR:",
        err
      );

      if (
        err.code === 11000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Place name already exists",
          });
      }

      res.status(500)
        .json({
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
        return res
          .status(404)
          .json({
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

      res.status(500)
        .json({
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
            PLACE_POPULATE
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const formatted =
        places.map(
          formatPlace
        );

      res.json(
        formatted
      );

    } catch (err) {

      console.error(
        "CATEGORY PLACE ERROR:",
        err
      );

      res.status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

module.exports = router;