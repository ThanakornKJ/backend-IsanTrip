const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Festival = require("../models/Festival");
const Province = require("../models/Province");
const FestivalType = require("../models/FestivalType");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  uploadFestivals,
  getCloudinaryImageUrl,
  getCloudinaryPublicId,
} = require("../middleware/upload");

const { FESTIVAL_POPULATE } = require("../utils/populateConfig");

// =====================================================
// ================= HELPERS ===========================
// =====================================================
const parseJsonField = (field) => {
  if (!field) {
    return [];
  }

  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch (_) {
      return [];
    }
  }

  return field;
};

const buildFestivalImages = (files = []) => {
  return files
    .map((file, index) => {
      const imageURL = getCloudinaryImageUrl(file);

      if (!imageURL) {
        return null;
      }

      return {
        imageURL,
        publicId: getCloudinaryPublicId(file),
        isCover: index === 0,
      };
    })
    .filter(Boolean);
};

const findProvinceByNameOrId = async (provinceValue) => {
  if (!provinceValue) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(provinceValue)) {
    const provinceById = await Province.findById(provinceValue);

    if (provinceById) {
      return provinceById;
    }
  }

  return Province.findOne({
    name: provinceValue,
  });
};

const findFestivalTypeByNameOrId = async ({
  festivalTypeId,
  festivalType,
}) => {
  const value = festivalTypeId || festivalType;

  if (!value) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    const festivalTypeById = await FestivalType.findById(value);

    if (festivalTypeById) {
      return festivalTypeById;
    }
  }

  return FestivalType.findOne({
    name: value,
  });
};

const buildFestivalLocations = async (
  festivalLocations,
  defaultProvinceId
) => {
  const locationsData = parseJsonField(festivalLocations);

  if (!Array.isArray(locationsData)) {
    return [];
  }

  const locations = [];

  for (const item of locationsData) {
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);

    const isValidGps =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    if (!isValidGps) {
      continue;
    }

    let locationProvinceId = item.provinceId || defaultProvinceId;

    if (item.province && !item.provinceId) {
      const provinceDoc = await findProvinceByNameOrId(item.province);

      if (provinceDoc) {
        locationProvinceId = provinceDoc._id;
      }
    }

    locations.push({
      provinceId: locationProvinceId,
      locationName: item.locationName || "",
      latitude,
      longitude,
      eventDate: item.eventDate || null,
      description: item.description || "",
    });
  }

  return locations;
};

// =====================================================
// ================= GET ALL FESTIVALS =================
// ใช้ได้ทั้ง admin และ user
// ตัวอย่าง:
// GET /api/festivals
// GET /api/festivals?festivalTypeId=xxxxx
// GET /api/festivals?status=published
// =====================================================
router.get("/", protect, async (req, res) => {
  try {
    const {
      festivalTypeId,
      status,
    } = req.query;

    const filter = {};

    if (festivalTypeId) {
      filter.festivalTypeId = festivalTypeId;
    }

    if (status) {
      filter.status = status;
    }

    const festivals = await Festival.find(filter)
      .populate(FESTIVAL_POPULATE)
      .sort({
        startDate: -1,
      })
      .lean();

    res.json(festivals);
  } catch (err) {
    console.error("GET FESTIVALS ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// ============= GET FESTIVALS BY TYPE =================
// ใช้ฝั่ง user ตอนกดการ์ดประเภทเทศกาล
// GET /api/festivals/type/:festivalTypeId
// =====================================================
router.get("/type/:festivalTypeId", protect, async (req, res) => {
  try {
    const festivals = await Festival.find({
      festivalTypeId: req.params.festivalTypeId,
      status: "published",
    })
      .populate(FESTIVAL_POPULATE)
      .sort({
        startDate: -1,
      })
      .lean();

    res.json(festivals);
  } catch (err) {
    console.error("GET FESTIVALS BY TYPE ERROR:", err);

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
      .populate(FESTIVAL_POPULATE)
      .lean();

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
  uploadFestivals.array("festivalImages", 10),
  async (req, res) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        provinceId,
        festivalType,
        festivalTypeId,
        status,
        festivalLocations,
      } = req.body;

      if (
        !festivalName ||
        !startDate ||
        !endDate ||
        (!province && !provinceId) ||
        (!festivalType && !festivalTypeId)
      ) {
        return res.status(400).json({
          message:
            "festivalName, startDate, endDate, province และ festivalType จำเป็นต้องกรอก",
        });
      }

      const provinceDoc = await findProvinceByNameOrId(
        provinceId || province
      );

      if (!provinceDoc) {
        return res.status(400).json({
          message: "ไม่พบจังหวัด",
        });
      }

      const festivalTypeDoc = await findFestivalTypeByNameOrId({
        festivalTypeId,
        festivalType,
      });

      if (!festivalTypeDoc) {
        return res.status(400).json({
          message: "ไม่พบประเภทเทศกาล",
        });
      }

      const createdFestival = await Festival.create({
        festivalName,
        description: description || "",
        startDate,
        endDate,
        provinceId: provinceDoc._id,
        festivalTypeId: festivalTypeDoc._id,
        status: status || "published",
        festivalImages: buildFestivalImages(req.files || []),
        festivalLocations: await buildFestivalLocations(
          festivalLocations,
          provinceDoc._id
        ),
      });

      const populatedFestival = await Festival.findById(createdFestival._id)
        .populate(FESTIVAL_POPULATE)
        .lean();

      res.status(201).json(populatedFestival);
    } catch (err) {
      console.error("CREATE FESTIVAL ERROR:", err);

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
  uploadFestivals.array("festivalImages", 10),
  async (req, res) => {
    try {
      const festival = await Festival.findById(req.params.id);

      if (!festival) {
        return res.status(404).json({
          message: "Festival not found",
        });
      }

      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        provinceId,
        festivalType,
        festivalTypeId,
        status,
        festivalLocations,
      } = req.body;

      if (festivalName !== undefined) {
        festival.festivalName = festivalName;
      }

      if (description !== undefined) {
        festival.description = description;
      }

      if (startDate !== undefined) {
        festival.startDate = startDate;
      }

      if (endDate !== undefined) {
        festival.endDate = endDate;
      }

      if (status !== undefined) {
        festival.status = status;
      }

      if (province !== undefined || provinceId !== undefined) {
        const provinceDoc = await findProvinceByNameOrId(
          provinceId || province
        );

        if (!provinceDoc) {
          return res.status(400).json({
            message: "ไม่พบจังหวัด",
          });
        }

        festival.provinceId = provinceDoc._id;
      }

      if (festivalType !== undefined || festivalTypeId !== undefined) {
        const festivalTypeDoc = await findFestivalTypeByNameOrId({
          festivalTypeId,
          festivalType,
        });

        if (!festivalTypeDoc) {
          return res.status(400).json({
            message: "ไม่พบประเภทเทศกาล",
          });
        }

        festival.festivalTypeId = festivalTypeDoc._id;
      }

      if (festivalLocations !== undefined) {
        festival.festivalLocations = await buildFestivalLocations(
          festivalLocations,
          festival.provinceId
        );
      }

      if (req.files?.length > 0) {
        festival.festivalImages = buildFestivalImages(req.files);
      }

      await festival.save();

      const updatedFestival = await Festival.findById(festival._id)
        .populate(FESTIVAL_POPULATE)
        .lean();

      res.json(updatedFestival);
    } catch (err) {
      console.error("UPDATE FESTIVAL ERROR:", err);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// ================= DELETE FESTIVAL ===================
// =====================================================
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const deletedFestival = await Festival.findByIdAndDelete(req.params.id);

    if (!deletedFestival) {
      return res.status(404).json({
        message: "Festival not found",
      });
    }

    res.json({
      message: "Festival deleted successfully",
    });
  } catch (err) {
    console.error("DELETE FESTIVAL ERROR:", err);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;