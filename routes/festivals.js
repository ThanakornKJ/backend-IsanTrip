const express = require("express");
const router = express.Router();

const Festival = require("../models/Festival");
const Province = require("../models/Province");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { uploadFestivals } = require("../middleware/upload");

// =====================================================
// ================= GET ALL FESTIVALS =================
// =====================================================
router.get("/", protect, async (req, res) => {
  try {
    const festivals = await Festival.find()
      .populate("provinceId", "name")
      .populate({
        path: "festivalLocations.placeId",
        select:
          "placeName provinceId latitude longitude placeImages",
        populate: {
          path: "provinceId",
          select: "name",
        },
      })
      .sort({ startDate: -1 });

    res.json(festivals);
  } catch (err) {
    console.error("GET FESTIVALS ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= GET FESTIVAL BY ID ================
// =====================================================
router.get("/:id", protect, async (req, res) => {
  try {
    const festival = await Festival.findById(req.params.id)
      .populate("provinceId", "name")
      .populate({
        path: "festivalLocations.placeId",
        select:
          "placeName provinceId latitude longitude placeImages",
        populate: {
          path: "provinceId",
          select: "name",
        },
      });

    if (!festival) {
      return res.status(404).json({
        message: "Festival not found",
      });
    }

    res.json(festival);
  } catch (err) {
    console.error("GET FESTIVAL ERROR:", err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ================= CREATE FESTIVAL ===================
// =====================================================
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadFestivals.array("images", 10),
  async (req, res) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations,
      } = req.body;

      // validation
      if (
        !festivalName ||
        !startDate ||
        !endDate ||
        !province
      ) {
        return res.status(400).json({
          message:
            "festivalName, startDate, endDate, province จำเป็นต้องกรอก",
        });
      }

      // หา provinceId
      const provinceDoc =
        await Province.findOne({
          name: province,
        });

      if (!provinceDoc) {
        return res.status(400).json({
          message: "ไม่พบจังหวัด",
        });
      }

      // parse locations
      let parsedLocations = [];

      if (festivalLocations) {
        parsedLocations =
          typeof festivalLocations === "string"
            ? JSON.parse(festivalLocations)
            : festivalLocations;

        parsedLocations =
          parsedLocations.map((loc) => ({
            placeId: loc.placeId,
            eventDate:
              loc.eventDate || null,
            description:
              loc.description || "",
          }));
      }

      // upload image
      const festivalImages =
        req.files?.map(
          (file, index) => ({
            imageURL:
              `uploads/festivals/${file.filename}`,
            isCover: index === 0,
          })
        ) || [];

      // create
      const newFestival =
        await Festival.create({
          festivalName,
          description,
          startDate,
          endDate,

          provinceId:
            provinceDoc._id,

          festivalImages,
          festivalLocations:
            parsedLocations,
        });

      const populated =
        await Festival.findById(
          newFestival._id
        )
          .populate(
            "provinceId",
            "name"
          )
          .populate({
            path:
              "festivalLocations.placeId",
            select:
              "placeName provinceId latitude longitude placeImages",
            populate: {
              path: "provinceId",
              select: "name",
            },
          });

      res.status(201).json(populated);
    } catch (err) {
      console.error(
        "CREATE FESTIVAL ERROR:",
        err
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= UPDATE FESTIVAL ===================
// =====================================================
router.put(
  "/:id",
  protect,
  authorize("admin"),
  uploadFestivals.array("images", 10),
  async (req, res) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations,
      } = req.body;

      const updateData = {};

      if (festivalName) {
        updateData.festivalName =
          festivalName;
      }

      if (description) {
        updateData.description =
          description;
      }

      if (startDate) {
        updateData.startDate =
          startDate;
      }

      if (endDate) {
        updateData.endDate =
          endDate;
      }

      // province → provinceId
      if (province) {
        const provinceDoc =
          await Province.findOne({
            name: province,
          });

        if (!provinceDoc) {
          return res.status(400).json({
            message:
              "ไม่พบจังหวัด",
          });
        }

        updateData.provinceId =
          provinceDoc._id;
      }

      // locations
      if (festivalLocations) {
        let parsedLocations =
          typeof festivalLocations ===
          "string"
            ? JSON.parse(
                festivalLocations
              )
            : festivalLocations;

        updateData.festivalLocations =
          parsedLocations.map(
            (loc) => ({
              placeId:
                loc.placeId,
              eventDate:
                loc.eventDate ||
                null,
              description:
                loc.description ||
                "",
            })
          );
      }

      // image
      if (
        req.files &&
        req.files.length > 0
      ) {
        updateData.festivalImages =
          req.files.map(
            (file, index) => ({
              imageURL:
                `uploads/festivals/${file.filename}`,
              isCover:
                index === 0,
            })
          );
      }

      const updated =
        await Festival.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            "provinceId",
            "name"
          )
          .populate({
            path:
              "festivalLocations.placeId",
            select:
              "placeName provinceId latitude longitude placeImages",
            populate: {
              path: "provinceId",
              select: "name",
            },
          });

      if (!updated) {
        return res.status(404).json({
          message:
            "Festival not found",
        });
      }

      res.json(updated);
    } catch (err) {
      console.error(
        "UPDATE FESTIVAL ERROR:",
        err
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= DELETE FESTIVAL ===================
// =====================================================
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const deleted =
        await Festival.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          message:
            "Festival not found",
        });
      }

      res.json({
        message:
          "Festival deleted successfully",
      });
    } catch (err) {
      console.error(
        "DELETE FESTIVAL ERROR:",
        err
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;