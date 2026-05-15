const express = require("express");
const router = express.Router();

const Trip = require("../models/Trip");

const protect = require("../middleware/authMiddleware");
const {
  uploadTrips,
} = require("../middleware/upload");

// =====================================================
// ================= POPULATE CONFIG ===================
// =====================================================

const TRIP_POPULATE = [
  {
    path: "tripPlaces.placeId",
    select:
      "placeName provinceId latitude longitude placeImages categoryId typeId",
    populate: [
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
    ],
  },

  {
    path: "tripFestivals.festivalId",
    select:
      "festivalName startDate endDate provinceId festivalImages",
    populate: {
      path: "provinceId",
      select: "name",
    },
  },

  {
    path: "userId",
    select:
      "fullName profileImage email",
  },
];

// =====================================================
// ================= CREATE TRIP =======================
// =====================================================
router.post(
  "/create",
  protect,
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
        startLocation,
        description,
        tripPlaces,
        tripFestivals,
      } = req.body;

      // ================= VALIDATION =================
      if (
        !tripName ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          message:
            "tripName, startDate และ endDate จำเป็นต้องกรอก",
        });
      }

      // ================= TRIP PLACES =================
      let parsedPlaces = [];

      if (tripPlaces) {
        parsedPlaces =
          typeof tripPlaces ===
          "string"
            ? JSON.parse(
                tripPlaces
              )
            : tripPlaces;

        parsedPlaces =
          parsedPlaces
            .map((p) => ({
              placeId:
                p.placeId,

              sequenceNo:
                Number(
                  p.sequenceNo
                ),

              visitDate:
                p.visitDate ||
                null,
            }))
            .sort(
              (a, b) =>
                a.sequenceNo -
                b.sequenceNo
            );
      }

      // ================= FESTIVALS =================
      let parsedFestivals = [];

      if (tripFestivals) {
        parsedFestivals =
          typeof tripFestivals ===
          "string"
            ? JSON.parse(
                tripFestivals
              )
            : tripFestivals;

        parsedFestivals =
          parsedFestivals.map(
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
      const tripImages =
        req.files?.map(
          (
            file,
            index
          ) => ({
            imageURL:
              `uploads/trips/${file.filename}`,

            isCover:
              index === 0,
          })
        ) || [];

      // ================= CREATE =================
      const trip =
        await Trip.create({
          userId:
            req.user._id,

          tripName,

          startDate,
          endDate,

          startLocation:
            startLocation ||
            "",

          description:
            description ||
            "",

          tripImages,

          tripPlaces:
            parsedPlaces,

          tripFestivals:
            parsedFestivals,
        });

      // ================= RESPONSE =================
      const populated =
        await Trip.findById(
          trip._id
        ).populate(
          TRIP_POPULATE
        );

      res.status(201).json(
        populated
      );
    } catch (err) {
      console.error(
        "CREATE TRIP ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Create trip failed",
      });
    }
  }
);


// =====================================================
// ================= GET MY TRIPS ======================
// =====================================================
router.get(
  "/my-trips",
  protect,
  async (req, res) => {
    try {
      const trips =
        await Trip.find({
          userId:
            req.user._id,
        })
          .populate(
            TRIP_POPULATE
          )
          .sort({
            createdAt:
              -1,
          });

      res.json(trips);
    } catch (err) {
      console.error(
        "GET MY TRIPS ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Load trips failed",
      });
    }
  }
);

// =====================================================
// ================= GET PUBLIC TRIPS ==================
// =====================================================
router.get(
  "/public",
  async (req, res) => {
    try {
      const trips =
        await Trip.find({
          isPublic: true,
        })
          .populate(
            TRIP_POPULATE
          )
          .sort({
            createdAt:
              -1,
          });

      res.json(trips);
    } catch (err) {
      console.error(
        "GET PUBLIC TRIPS ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Load public trips failed",
      });
    }
  }
);

// =====================================================
// ================= GET SINGLE TRIP ===================
// =====================================================
router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const trip =
        await Trip.findById(
          req.params.id
        ).populate(
          TRIP_POPULATE
        );

      if (!trip) {
        return res.status(404).json({
          message:
            "Trip not found",
        });
      }

      // ==========================================
      // owner OR public only
      // ==========================================
      const isOwner =
        trip.userId._id.equals(
          req.user._id
        );

      if (
        !isOwner &&
        !trip.isPublic
      ) {
        return res.status(403).json({
          message:
            "Not allowed",
        });
      }

      res.json(trip);
    } catch (err) {
      console.error(
        "GET TRIP ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Load trip failed",
      });
    }
  }
);

// =====================================================
// ================= UPDATE TRIP ========================
// =====================================================
router.put(
  "/:id",
  protect,
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
        startLocation,
        description,
        tripPlaces,
        tripFestivals,
      } = req.body;

      // ==========================================
      // หา trip ของ owner เท่านั้น
      // ==========================================
      const trip =
        await Trip.findOne({
          _id:
            req.params.id,

          userId:
            req.user._id,
        });

      if (!trip) {
        return res.status(404).json({
          message:
            "Trip not found",
        });
      }

      const updateData =
        {};

      // ==========================================
      // BASIC INFO
      // ==========================================
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
        startLocation !==
        undefined
      ) {
        updateData.startLocation =
          startLocation;
      }

      if (
        description !==
        undefined
      ) {
        updateData.description =
          description;
      }

      // ==========================================
      // TRIP PLACES
      // ==========================================
      if (tripPlaces) {
        let parsedPlaces =
          typeof tripPlaces ===
          "string"
            ? JSON.parse(
                tripPlaces
              )
            : tripPlaces;

        updateData.tripPlaces =
          parsedPlaces
            .map((p) => ({
              placeId:
                p.placeId,

              sequenceNo:
                Number(
                  p.sequenceNo
                ),

              visitDate:
                p.visitDate ||
                null,
            }))
            .sort(
              (a, b) =>
                a.sequenceNo -
                b.sequenceNo
            );
      }

      // ==========================================
      // FESTIVALS
      // ==========================================
      if (
        tripFestivals
      ) {
        let parsedFestivals =
          typeof tripFestivals ===
          "string"
            ? JSON.parse(
                tripFestivals
              )
            : tripFestivals;

        updateData.tripFestivals =
          parsedFestivals.map(
            (f) => ({
              festivalId:
                f.festivalId,

              attendDate:
                f.attendDate ||
                null,
            })
          );
      }

      // ==========================================
      // IMAGES
      // ==========================================
      if (
        req.files &&
        req.files.length >
          0
      ) {
        updateData.tripImages =
          req.files.map(
            (
              file,
              index
            ) => ({
              imageURL:
                `uploads/trips/${file.filename}`,

              isCover:
                index ===
                0,
            })
          );
      }

      // ==========================================
      // UPDATE
      // ==========================================
      const updatedTrip =
        await Trip.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          TRIP_POPULATE
        );

      res.json(
        updatedTrip
      );
    } catch (err) {
      console.error(
        "UPDATE TRIP ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Update trip failed",
      });
    }
  }
);


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

// =====================================================
// ================= SHARE TRIP =========================
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
      }
    )
      .populate("tripPlaces.placeId")
      .populate("tripFestivals.festivalId");

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
// ================= MAKE PRIVATE =======================
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
      }
    )
      .populate("tripPlaces.placeId")
      .populate("tripFestivals.festivalId");

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
// ================= SAVE PUBLIC TRIP ===================
// =====================================================
router.post("/:id/save", protect, async (req, res) => {
  try {
    const sourceTrip = await Trip.findById(req.params.id);

    if (!sourceTrip || !sourceTrip.isPublic) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    // ห้าม save trip ตัวเอง
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

      tripPlaces: sourceTrip.tripPlaces.map((p) => ({
        placeId: p.placeId,
        sequenceNo: p.sequenceNo,
        visitDate: p.visitDate || null,
      })),

      tripFestivals: sourceTrip.tripFestivals.map((f) => ({
        festivalId: f.festivalId,
        attendDate: f.attendDate || null,
      })),

      isPublic: false,
    });

    const populatedTrip = await Trip.findById(clonedTrip._id)
      .populate("tripPlaces.placeId")
      .populate("tripFestivals.festivalId");

    res.status(201).json(populatedTrip);

  } catch (err) {
    console.error("SAVE TRIP ERROR:", err);
    res.status(500).json({
      message: "Save trip failed",
    });
  }
});


// =====================================================
// ================= ADD PLACE TO TRIP ==================
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
      (item) =>
        item.placeId.toString() === placeId
    );

    if (alreadyExists) {
      return res.status(400).json({
        message: "Place already exists in trip",
      });
    }

    const maxSequence =
      trip.tripPlaces.length > 0
        ? Math.max(
            ...trip.tripPlaces.map(
              (p) => p.sequenceNo
            )
          )
        : 0;

    trip.tripPlaces.push({
      placeId,
      sequenceNo: maxSequence + 1,
      visitDate: visitDate || null,
    });

    await trip.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate("tripPlaces.placeId")
      .populate("tripFestivals.festivalId");

    res.json(updatedTrip);

  } catch (err) {
    console.error("ADD PLACE ERROR:", err);
    res.status(500).json({
      message: "Add place failed",
    });
  }
});


// =====================================================
// ================= ADD FESTIVAL TO TRIP ===============
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

    const alreadyExists =
      trip.tripFestivals.some(
        (item) =>
          item.festivalId.toString() === festivalId
      );

    if (alreadyExists) {
      return res.status(400).json({
        message:
          "Festival already exists in trip",
      });
    }

    trip.tripFestivals.push({
      festivalId,
      attendDate: attendDate || null,
    });

    await trip.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate("tripPlaces.placeId")
      .populate("tripFestivals.festivalId");

    res.json(updatedTrip);

  } catch (err) {
    console.error("ADD FESTIVAL ERROR:", err);
    res.status(500).json({
      message: "Add festival failed",
    });
  }
});

module.exports = router;