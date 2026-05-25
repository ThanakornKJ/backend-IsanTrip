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

const {
  uploadPlaces,
  uploadTrips,
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

const TRIP_POPULATE = [
  {
    path: "userId",
    select:
      "fullName email profileImage userType",
  },

  {
    path:
      "tripPlaces.placeId",

    populate: [
      {
        path:
          "provinceId",
        select:
          "name",
      },
      {
        path:
          "categoryId",
        select:
          "name",
      },
      {
        path:
          "typeId",
        select:
          "name",
      },
    ],
  },

  {
    path:
      "tripFestivals.festivalId",

    populate: {
      path:
        "provinceId",
      select:
        "name",
    },
  },
];

// =====================================================
// ================= HELPER ============================
// =====================================================

const resolveRelationIds =
  async ({
    province,
    category,
    touristType,
  }) => {

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

    return {
      provinceId:
        provinceDoc?._id ||
        null,

      categoryId:
        categoryDoc?._id ||
        null,

      typeId:
        typeDoc?._id ||
        null,
    };
  };

// =====================================================
// ================= CREATE PLACE ======================
// =====================================================

router.post(
  "/places",
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

      if (!placeName) {
        return res
          .status(400)
          .json({
            message:
              "placeName is required",
          });
      }

      const {
        provinceId,
        categoryId,
        typeId,
      } =
        await resolveRelationIds({
          province,
          category,
          touristType,
        });

      const parsedLatitude =
        latitude !==
          undefined
          ? Number(
              latitude
            )
          : 0;

      const parsedLongitude =
        longitude !==
          undefined
          ? Number(
              longitude
            )
          : 0;

      const placeImages =
        req.files?.map(
          (
            file,
            index
          ) => ({
            imageURL:
              `/uploads/places/${file.filename}`,

            isCover:
              index ===
              0,
          })
        ) || [];

      const newPlace =
        await TouristPlace.create(
          {
            placeName,
            description,
            address,

            provinceId,
            categoryId,
            typeId,

            latitude:
              parsedLatitude,

            longitude:
              parsedLongitude,

            location: {
              type:
                "Point",

              coordinates:
                [
                  parsedLongitude,
                  parsedLatitude,
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
        ).populate(
          PLACE_POPULATE
        );

      res
        .status(201)
        .json(
          populated
        );

    } catch (err) {

      console.error(
        "CREATE PLACE ERROR:",
        err
      );

      if (
        err.code ===
        11000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Place already exists",
          });
      }

      res
        .status(500)
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
  "/places",
  protect,
  authorize("admin"),

  async (req, res) => {
    try {

      const places =
        await TouristPlace.find()
          .populate(
            PLACE_POPULATE
          )
          .sort({
            createdAt:
              -1,
          })
          .lean();

      res.json(
        places
      );

    } catch (err) {

      console.error(
        "GET PLACES ERROR:",
        err
      );

      res
        .status(500)
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
  "/places/:id",
  protect,
  authorize("admin"),

  async (req, res) => {
    try {

      const place =
        await TouristPlace.findById(
          req.params.id
        )
          .populate(
            PLACE_POPULATE
          );

      if (!place) {
        return res
          .status(404)
          .json({
            message:
              "Place not found",
          });
      }

      res.json(
        place
      );

    } catch (err) {

      console.error(
        "GET PLACE ERROR:",
        err
      );

      res
        .status(500)
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
  "/places/:id",
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

      const {
        provinceId,
        categoryId,
        typeId,
      } =
        await resolveRelationIds({
          province,
          category,
          touristType,
        });

      const updateData =
        {};

      // ================= BASIC =================

      if (
        placeName !==
        undefined
      ) {
        updateData.placeName =
          placeName;
      }

      if (
        description !==
        undefined
      ) {
        updateData.description =
          description;
      }

      if (
        address !==
        undefined
      ) {
        updateData.address =
          address;
      }

      if (
        openingHours !==
        undefined
      ) {
        updateData.openingHours =
          openingHours;
      }

      if (
        contact !==
        undefined
      ) {
        updateData.contact =
          contact;
      }

      if (
        entranceFee !==
        undefined
      ) {
        updateData.entranceFee =
          entranceFee;
      }

      if (
        socialMedia !==
        undefined
      ) {
        updateData.socialMedia =
          socialMedia;
      }

      if (
        highlight !==
        undefined
      ) {
        updateData.highlight =
          highlight;
      }

      if (
        travelInfo !==
        undefined
      ) {
        updateData.travelInfo =
          travelInfo;
      }

      // ================= RELATION =================

      if (
        province !==
        undefined
      ) {
        updateData.provinceId =
          provinceId;
      }

      if (
        category !==
        undefined
      ) {
        updateData.categoryId =
          categoryId;
      }

      if (
        touristType !==
        undefined
      ) {
        updateData.typeId =
          typeId;
      }

      // ================= LOCATION =================

      let parsedLatitude =
        place.latitude;

      let parsedLongitude =
        place.longitude;

      if (
        latitude !==
        undefined
      ) {
        parsedLatitude =
          Number(
            latitude
          );

        updateData.latitude =
          parsedLatitude;
      }

      if (
        longitude !==
        undefined
      ) {
        parsedLongitude =
          Number(
            longitude
          );

        updateData.longitude =
          parsedLongitude;
      }

      updateData.location =
        {
          type:
            "Point",

          coordinates:
            [
              parsedLongitude,
              parsedLatitude,
            ],
        };

      // ================= IMAGES =================

      if (
        req.files &&
        req.files.length >
          0
      ) {

        updateData.placeImages =
          req.files.map(
            (
              file,
              index
            ) => ({
              imageURL:
                `/uploads/places/${file.filename}`,

              isCover:
                index ===
                0,
            })
          );
      }

      const updated =
        await TouristPlace.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators:
              true,
          }
        ).populate(
          PLACE_POPULATE
        );

      res.json(
        updated
      );

    } catch (err) {

      console.error(
        "UPDATE PLACE ERROR:",
        err
      );

      res
        .status(500)
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
  "/places/:id",
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

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
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

      const [
        totalUsers,
        totalPlaces,
        totalTrips,
        totalFestivals,
        totalReviews,
      ] =
        await Promise.all([
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

      console.error(
        "STATS ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= UPDATE TRIP =======================
// =====================================================

router.put(
  "/trips/:id",
  protect,
  authorize("admin"),
  uploadTrips.array(
    "tripImages",
    10
  ),

  async (req, res) => {
    try {

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

      const updateData =
        {};

      // ================= BASIC =================

      if (
        tripName !==
        undefined
      ) {
        updateData.tripName =
          tripName;
      }

      if (
        startDate !==
        undefined
      ) {
        updateData.startDate =
          startDate;
      }

      if (
        endDate !==
        undefined
      ) {
        updateData.endDate =
          endDate;
      }

      if (
        description !==
        undefined
      ) {
        updateData.description =
          description;
      }

      if (
        startLocation !==
        undefined
      ) {
        updateData.startLocation =
          startLocation;
      }

      if (
        typeof isPublic !==
        "undefined"
      ) {
        updateData.isPublic =
          isPublic ===
            true ||
          isPublic ===
            "true";
      }

      // ================= TRIP PLACES =================

      if (
        tripPlaces !==
        undefined
      ) {

        const parsed =
          typeof tripPlaces ===
          "string"
            ? JSON.parse(
                tripPlaces
              )
            : tripPlaces;

        updateData.tripPlaces =
          parsed
            .map(
              (p) => ({
                placeId:
                  p.placeId,

                sequenceNo:
                  Number(
                    p.sequenceNo
                  ),

                visitDate:
                  p.visitDate ||
                  null,
              })
            )
            .sort(
              (
                a,
                b
              ) =>
                a.sequenceNo -
                b.sequenceNo
            );
      }

      // ================= TRIP FESTIVALS =================

      if (
        tripFestivals !==
        undefined
      ) {

        const parsed =
          typeof tripFestivals ===
          "string"
            ? JSON.parse(
                tripFestivals
              )
            : tripFestivals;

        updateData.tripFestivals =
          parsed.map(
            (f) => ({
              festivalId:
                f.festivalId,

              attendDate:
                f.attendDate ||
                null,
            })
          );
      }

      // ================= IMAGES =================

      if (
        req.files?.length >
        0
      ) {

        updateData.tripImages =
          req.files.map(
            (
              file,
              index
            ) => ({
              imageURL:
                `/uploads/trips/${file.filename}`,

              isCover:
                index ===
                0,
            })
          );
      }

      const updatedTrip =
        await Trip.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators:
              true,
          }
        ).populate(
          TRIP_POPULATE
        );

      if (
        !updatedTrip
      ) {
        return res
          .status(404)
          .json({
            message:
              "Trip not found",
          });
      }

      res.json(
        updatedTrip
      );

    } catch (err) {

      console.error(
        "UPDATE TRIP ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Update trip failed",
        });
    }
  }
);

// =====================================================
// ================= GET ALL TRIPS =====================
// =====================================================

router.get(
  "/trips",
  protect,
  authorize("admin"),

  async (req, res) => {
    try {

      const trips =
        await Trip.find()
          .populate(
            TRIP_POPULATE
          )
          .sort({
            createdAt:
              -1,
          })
          .lean();

      res.json(
        trips
      );

    } catch (err) {

      console.error(
        "GET TRIPS ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= GET TRIP BY ID ====================
// =====================================================

router.get(
  "/trips/:id",
  protect,
  authorize("admin"),

  async (req, res) => {
    try {

      const trip =
        await Trip.findById(
          req.params.id
        ).populate(
          TRIP_POPULATE
        );

      if (!trip) {
        return res
          .status(404)
          .json({
            message:
              "Trip not found",
          });
      }

      res.json(
        trip
      );

    } catch (err) {

      console.error(
        "GET TRIP ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= DELETE TRIP =======================
// =====================================================

router.delete(
  "/trips/:id",
  protect,
  authorize("admin"),

  async (req, res) => {
    try {

      const deletedTrip =
        await Trip.findByIdAndDelete(
          req.params.id
        );

      if (
        !deletedTrip
      ) {
        return res
          .status(404)
          .json({
            message:
              "Trip not found",
          });
      }

      res.json({
        message:
          "Trip deleted successfully",
      });

    } catch (err) {

      console.error(
        "DELETE TRIP ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Delete trip failed",
        });
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

      const {
        isPublic,
      } = req.body;

      const trip =
        await Trip.findByIdAndUpdate(
          req.params.id,
          {
            isPublic:
              isPublic ===
                true ||
              isPublic ===
                "true",
          },
          {
            new: true,
          }
        ).populate(
          TRIP_POPULATE
        );

      if (!trip) {
        return res
          .status(404)
          .json({
            message:
              "Trip not found",
          });
      }

      res.json(
        trip
      );

    } catch (err) {

      console.error(
        "UPDATE TRIP STATUS ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Update status failed",
        });
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

      const users =
        await User.find()
          .select(
            "+password"
          )
          .sort({
            createdAt:
              -1,
          })
          .lean();

      const formatted =
        users.map(
          (u) => ({
            _id:
              u._id,

            fullName:
              u.fullName,

            email:
              u.email,

            facebookId:
              u.facebookId,

            profileImage:
              u.profileImage,

            userType:
              u.userType,

            createdAt:
              u.createdAt,

            updatedAt:
              u.updatedAt,
          })
        );

      res.json(
        formatted
      );

    } catch (err) {

      console.error(
        "GET USERS ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

// =====================================================
// ================= UPDATE USER =======================
// =====================================================

router.put(
  "/users/:id",
  protect,
  authorize("admin"),

  async (req, res) => {
    try {

      const {
        fullName,
        email,
        password,
        userType,
        profileImage,
      } = req.body;

      const user =
        await User.findById(
          req.params.id
        ).select(
          "+password"
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              "User not found",
          });
      }

      // ================= EMAIL =================

      if (
        email &&
        email !==
          user.email
      ) {

        const exists =
          await User.findOne({
            email,
          });

        if (
          exists
        ) {
          return res
            .status(400)
            .json({
              message:
                "Email already exists",
            });
        }

        user.email =
          email;
      }

      // ================= BASIC =================

      if (
        fullName !==
        undefined
      ) {
        user.fullName =
          fullName;
      }

      if (
        userType !==
        undefined
      ) {
        user.userType =
          userType;
      }

      if (
        profileImage !==
        undefined
      ) {
        user.profileImage =
          profileImage;
      }

      // ================= PASSWORD =================

      if (
        password
      ) {

        const hashed =
          await bcrypt.hash(
            password,
            10
          );

        user.password =
          hashed;
      }

      await user.save();

      const result =
        await User.findById(
          user._id
        );

      res.json(
        result
      );

    } catch (err) {

      console.error(
        "UPDATE USER ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
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

      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res
          .status(404)
          .json({
            message:
              "User not found",
          });
      }

      await user.deleteOne();

      res.json({
        message:
          "User deleted successfully",
      });

    } catch (err) {

      console.error(
        "DELETE USER ERROR:",
        err
      );

      res
        .status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

module.exports =
  router;