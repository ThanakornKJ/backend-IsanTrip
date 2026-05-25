const express = require("express");

const router = express.Router();

const Festival = require("../models/Festival");
const Province = require("../models/Province");

const protect = require("../middleware/authMiddleware");

const authorize = require("../middleware/roleMiddleware");

const {
  uploadFestivals,
} = require("../middleware/upload");

// =====================================================
// ================= POPULATE CONFIG ===================
// =====================================================

const FESTIVAL_POPULATE = [
  {
    path: "provinceId",

    select: "name",
  },

  {
    path:
      "festivalLocations.placeId",

    select:
      `
      placeName
      provinceId
      categoryId
      typeId
      latitude
      longitude
      placeImages
      `,

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
];

// =====================================================
// ================= HELPER ============================
// =====================================================

const parseJsonField = (
  field
) => {
  if (!field) {
    return [];
  }

  if (
    typeof field ===
    "string"
  ) {
    return JSON.parse(
      field
    );
  }

  return field;
};

// =====================================================
// ================= GET ALL FESTIVALS =================
// =====================================================

router.get(
  "/",

  protect,

  async (
    req,
    res
  ) => {
    try {
      const festivals =
        await Festival.find()
          .populate(
            FESTIVAL_POPULATE
          )
          .sort({
            startDate:
              -1,
          });

      res.json(
        festivals
      );
    } catch (err) {
      console.error(
        "GET FESTIVALS ERROR:",
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
// ================= GET FESTIVAL BY ID ================
// =====================================================

router.get(
  "/:id",

  protect,

  async (
    req,
    res
  ) => {
    try {
      const festival =
        await Festival.findById(
          req.params.id
        ).populate(
          FESTIVAL_POPULATE
        );

      if (
        !festival
      ) {
        return res
          .status(404)
          .json({
            message:
              "Festival not found",
          });
      }

      res.json(
        festival
      );
    } catch (err) {
      console.error(
        "GET FESTIVAL ERROR:",
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
// ================= CREATE FESTIVAL ===================
// =====================================================

router.post(
  "/",

  protect,

  authorize(
    "admin"
  ),

  uploadFestivals.array(
    "festivalImages",
    10
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations,
      } = req.body;

      // ================= VALIDATION =================

      if (
        !festivalName ||
        !startDate ||
        !endDate ||
        !province
      ) {
        return res
          .status(400)
          .json({
            message:
              "festivalName, startDate, endDate และ province จำเป็นต้องกรอก",
          });
      }

      // ================= PROVINCE =================

      const provinceDoc =
        await Province.findOne(
          {
            name:
              province,
          }
        );

      if (
        !provinceDoc
      ) {
        return res
          .status(400)
          .json({
            message:
              "ไม่พบจังหวัด",
          });
      }

      // ================= LOCATIONS =================

      let parsedLocations =
        [];

      const locationsData =
        parseJsonField(
          festivalLocations
        );

      if (
        Array.isArray(
          locationsData
        )
      ) {
        parsedLocations =
          locationsData.map(
            (
              item
            ) => ({
              placeId:
                item.placeId,

              eventDate:
                item.eventDate ||
                null,

              description:
                item.description ||
                "",
            })
          );
      }

      // ================= IMAGES =================

      const festivalImages =
        req.files?.map(
          (
            file,
            index
          ) => ({
            imageURL:`/uploads/festivals/${file.filename}`,

            isCover:
              index === 0,
          })
        ) || [];

      // ================= CREATE =================

      const createdFestival =
        await Festival.create(
          {
            festivalName,

            description:
              description ||
              "",

            startDate,

            endDate,

            provinceId:
              provinceDoc._id,

            festivalImages,

            festivalLocations:
              parsedLocations,
          }
        );

      const populatedFestival =
        await Festival.findById(
          createdFestival._id
        ).populate(
          FESTIVAL_POPULATE
        );

      res
        .status(201)
        .json(
          populatedFestival
        );
    } catch (err) {
      console.error(
        "CREATE FESTIVAL ERROR:",
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
// ================= UPDATE FESTIVAL ===================
// =====================================================

router.put(
  "/:id",

  protect,

  authorize(
    "admin"
  ),

  uploadFestivals.array(
    "festivalImages",
    10
  ),

  async (
    req,
    res
  ) => {
    try {
      const festival =
        await Festival.findById(
          req.params.id
        );

      if (
        !festival
      ) {
        return res
          .status(404)
          .json({
            message:
              "Festival not found",
          });
      }

      const {
        festivalName,
        description,
        startDate,
        endDate,
        province,
        festivalLocations,
      } = req.body;

      const updateData =
        {};

      // ================= BASIC INFO =================

      if (
        festivalName !==
        undefined
      ) {
        updateData.festivalName =
          festivalName;
      }

      if (
        description !==
        undefined
      ) {
        updateData.description =
          description;
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

      // ================= PROVINCE =================

      if (
        province !==
        undefined
      ) {
        const provinceDoc =
          await Province.findOne(
            {
              name:
                province,
            }
          );

        if (
          !provinceDoc
        ) {
          return res
            .status(400)
            .json({
              message:
                "ไม่พบจังหวัด",
            });
        }

        updateData.provinceId =
          provinceDoc._id;
      }

      // ================= LOCATIONS =================

      if (
        festivalLocations !==
        undefined
      ) {
        const locationsData =
          parseJsonField(
            festivalLocations
          );

        updateData.festivalLocations =
          Array.isArray(
            locationsData
          )
            ? locationsData.map(
                (
                  item
                ) => ({
                  placeId:
                    item.placeId,

                  eventDate:
                    item.eventDate ||
                    null,

                  description:
                    item.description ||
                    "",
                })
              )
            : [];
      }

      // ================= IMAGES =================

      if (
        req.files &&
        req.files.length >
          0
      ) {
        updateData.festivalImages =
          req.files.map(
            (
              file,
              index
            ) => ({
              imageURL:`/uploads/festivals/${file.filename}`,

              isCover:
                index ===
                0,
            })
          );
      }

      // ================= UPDATE =================

      const updatedFestival =
        await Festival.findByIdAndUpdate(
          req.params.id,

          updateData,

          {
            new: true,
            runValidators:
              true,
          }
        ).populate(
          FESTIVAL_POPULATE
        );

      res.json(
        updatedFestival
      );
    } catch (err) {
      console.error(
        "UPDATE FESTIVAL ERROR:",
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
// ================= DELETE FESTIVAL ===================
// =====================================================

router.delete(
  "/:id",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const deletedFestival =
        await Festival.findByIdAndDelete(
          req.params.id
        );

      if (
        !deletedFestival
      ) {
        return res
          .status(404)
          .json({
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