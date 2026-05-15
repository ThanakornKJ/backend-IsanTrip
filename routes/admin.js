const express = require("express");
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
  uploadFestivals,
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
      "fullName email profileImage",
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
// ================= CREATE PLACE ======================
// =====================================================
router.post(
  "/places",
  protect,
  authorize("admin"),
  uploadPlaces.array(
    "images",
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
              "placeName required",
          });
      }

      // resolve ids
      const [
        provinceDoc,
        categoryDoc,
        typeDoc,
      ] =
        await Promise.all([
          province
            ? Province.findOne(
                {
                  name:
                    province,
                }
              )
            : null,

          category
            ? Category.findOne(
                {
                  name:
                    category,
                }
              )
            : null,

          touristType
            ? PlaceType.findOne(
                {
                  name:
                    touristType,
                }
              )
            : null,
        ]);

      const placeImages =
        req.files?.map(
          (
            file,
            index
          ) => ({
            imageURL:
              `uploads/places/${file.filename}`,

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

            provinceId:
              provinceDoc?._id,

            categoryId:
              categoryDoc?._id,

            typeId:
              typeDoc?._id,

            openingHours,
            contact,
            entranceFee,

            latitude:
              latitude
                ? Number(
                    latitude
                  )
                : undefined,

            longitude:
              longitude
                ? Number(
                    longitude
                  )
                : undefined,

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
        .json(populated);

    } catch (err) {
      console.error(
        "CREATE PLACE ERROR:",
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

      const formatted =
        places.map(
          (p) => {
            const cover =
              p.placeImages?.find(
                (
                  img
                ) =>
                  img.isCover
              ) ||
              p
                .placeImages?.[0];

            return {
              _id:
                p._id,

              placeName:
                p.placeName,

              province:
                p
                  .provinceId
                  ?.name ||
                "",

              category:
                p
                  .categoryId
                  ?.name ||
                "",

              touristType:
                p
                  .typeId
                  ?.name ||
                "",

              description:
                p.description,

              latitude:
                p.latitude,

              longitude:
                p.longitude,

              openingHours:
                p.openingHours,

              image:
                cover
                  ?.imageURL ||
                null,
            };
          }
        );

      res.json(
        formatted
      );

    } catch (err) {
      console.error(
        "GET PLACES ERROR:",
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
// ================= UPDATE PLACE ======================
// =====================================================
router.put(
  "/places/:id",
  protect,
  authorize("admin"),
  uploadPlaces.array(
    "images",
    10
  ),

  async (req, res) => {
    try {
      const place =
        await TouristPlace.findById(
          req.params.id
        );

      if (!place) {
        return res.status(404)
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

      // ==========================================
      // resolve relation ids
      // ==========================================
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

      const updateData =
        {};

      // ==========================================
      // basic fields
      // ==========================================
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

      // ==========================================
      // relation ids
      // ==========================================
      if (
        provinceDoc
      ) {
        updateData.provinceId =
          provinceDoc._id;
      }

      if (
        categoryDoc
      ) {
        updateData.categoryId =
          categoryDoc._id;
      }

      if (
        typeDoc
      ) {
        updateData.typeId =
          typeDoc._id;
      }

      // ==========================================
      // location
      // ==========================================
      if (
        latitude !==
        undefined
      ) {
        updateData.latitude =
          Number(
            latitude
          );
      }

      if (
        longitude !==
        undefined
      ) {
        updateData.longitude =
          Number(
            longitude
          );
      }

      // ==========================================
      // images
      // ==========================================
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
                `uploads/places/${file.filename}`,

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
            runValidators: true,
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
        return res.status(404)
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

      res.status(500)
        .json({
          message:
            "Server error",
        });
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

      const {
        tripName,
        startDate,
        endDate,
        description,
        startLocation,
        tripPlaces,
        tripFestivals,
        isPublic
      } = req.body;

      // ================= PARSE TRIP PLACES =================
      let parsedPlaces = [];

      if (tripPlaces) {
        const data =
          typeof tripPlaces === "string"
            ? JSON.parse(tripPlaces)
            : tripPlaces;

        parsedPlaces = data
          .map((p) => ({
            placeId: p.placeId,
            sequenceNo: Number(p.sequenceNo),
            visitDate: p.visitDate || null
          }))
          .sort((a, b) => a.sequenceNo - b.sequenceNo);
      }

      // ================= PARSE TRIP FESTIVALS =================
      let parsedFestivals = [];

      if (tripFestivals) {
        const data =
          typeof tripFestivals === "string"
            ? JSON.parse(tripFestivals)
            : tripFestivals;

        parsedFestivals = data.map((f) => ({
          festivalId: f.festivalId,
          attendDate: f.attendDate || null
        }));
      }

      const updateData = {};

      if (tripName) updateData.tripName = tripName;
      if (startDate) updateData.startDate = startDate;
      if (endDate) updateData.endDate = endDate;
      if (description) updateData.description = description;
      if (startLocation)
        updateData.startLocation = startLocation;

      if (typeof isPublic !== "undefined") {
        updateData.isPublic =
          isPublic === true || isPublic === "true";
      }

      if (parsedPlaces.length > 0) {
        updateData.tripPlaces = parsedPlaces;
      }

      if (parsedFestivals.length > 0) {
        updateData.tripFestivals = parsedFestivals;
      }

      // ================= UPDATE IMAGES =================
      if (req.files?.length > 0) {

        updateData.tripImages = req.files.map(
          (file, index) => ({
            imageURL: `/uploads/trips/${file.filename}`,
            isCover: index === 0,
          })
        );
      }

      const updatedTrip =
        await Trip.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true
          }
        )
          .populate(
            "tripPlaces.placeId",
            "placeName provinceId placeImages"
          )
          .populate(
            "tripFestivals.festivalId",
            "festivalName startDate endDate"
          )
          .populate(
            "userId",
            "fullName email profileImage"
          );

      if (!updatedTrip) {
        return res.status(404).json({
          message: "Trip not found"
        });
      }

      res.json(updatedTrip);

    } catch (err) {
      console.error(
        "ADMIN UPDATE TRIP ERROR:",
        err
      );

      res.status(500).json({
        message: "Update trip failed"
      });
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
        .populate(
          "tripPlaces.placeId",
          "placeName provinceId placeImages"
        )
        .populate(
          "tripFestivals.festivalId",
          "festivalName startDate endDate"
        )
        .populate(
          "userId",
          "fullName profileImage email"
        )
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
        .populate(
          "tripPlaces.placeId",
          "placeName provinceId placeImages"
        )
        .populate(
          "tripFestivals.festivalId",
          "festivalName startDate endDate"
        )
        .populate(
          "userId",
          "fullName email profileImage"
        );

      if (!trip) {
        return res.status(404).json({
          message: "Trip not found"
        });
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
      const deletedTrip =
        await Trip.findByIdAndDelete(
          req.params.id
        );

      if (!deletedTrip) {
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
        "ADMIN DELETE TRIP ERROR:",
        err
      );

      res.status(500)
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
        )
          .populate(
            "tripPlaces.placeId",
            "placeName provinceId placeImages"
          )
          .populate(
            "tripFestivals.festivalId",
            "festivalName startDate endDate"
          )
          .populate(
            "userId",
            "fullName profileImage email"
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

      res.status(500)
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
            "-password"
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

            profileImage:
              u.profileImage,

            userType:
              u.userType,

            createdAt:
              u.createdAt,
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

      res.status(500)
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
      } = req.body;

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

      // ================= EMAIL DUPLICATE CHECK =================
      if (
        email &&
        email !==
          user.email
      ) {
        const exists =
          await User.findOne(
            {
              email,
            }
          );

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

      // ================= UPDATE FIELDS =================
      if (
        fullName
      ) {
        user.fullName =
          fullName;
      }

      if (
        userType
      ) {
        user.userType =
          userType;
      }

      // ================= UPDATE PASSWORD =================
      if (
        password
      ) {
        const bcrypt =
          require(
            "bcryptjs"
          );

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
        ).select(
          "-password"
        );

      res.json(
        result
      );

    } catch (err) {
      console.error(
        "UPDATE USER ERROR:",
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

      res.status(500)
        .json({
          message:
            "Server error",
        });
    }
  }
);

module.exports = router;