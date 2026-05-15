const express = require("express");
const router = express.Router();

const Province = require("../models/Province");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// ==========================
// GET ALL PROVINCES
// ==========================
router.get("/", async (req, res) => {
  try {
    const provinces =
      await Province.find()
        .sort({
          provinceName: 1,
        });

    return res
      .status(200)
      .json({
        success: true,
        count:
          provinces.length,
        data: provinces,
      });
  } catch (error) {
    console.error(
      "GET PROVINCES ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to fetch provinces",
      });
  }
});

// ==========================
// GET PROVINCE BY ID
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const province =
      await Province.findById(
        req.params.id
      );

    if (!province) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Province not found",
        });
    }

    return res
      .status(200)
      .json({
        success: true,
        data: province,
      });
  } catch (error) {
    console.error(
      "GET PROVINCE ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Failed to fetch province",
      });
  }
});

// ==========================
// CREATE PROVINCE
// ADMIN ONLY
// ==========================
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const {
        provinceName,
      } = req.body;

      if (
        !provinceName
      ) {
        return res
          .status(400)
          .json({
            success:
              false,
            message:
              "provinceName is required",
          });
      }

      const exists =
        await Province.findOne(
          {
            provinceName:
              provinceName.trim(),
          }
        );

      if (exists) {
        return res
          .status(409)
          .json({
            success:
              false,
            message:
              "Province already exists",
          });
      }

      const province =
        await Province.create(
          {
            provinceName:
              provinceName.trim(),
          }
        );

      return res
        .status(201)
        .json({
          success: true,
          message:
            "Province created successfully",
          data: province,
        });
    } catch (error) {
      console.error(
        "CREATE PROVINCE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to create province",
        });
    }
  }
);

// ==========================
// UPDATE PROVINCE
// ADMIN ONLY
// ==========================
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const {
        provinceName,
      } = req.body;

      const province =
        await Province.findById(
          req.params.id
        );

      if (!province) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Province not found",
          });
      }

      province.provinceName =
        provinceName ||
        province.provinceName;

      await province.save();

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Province updated successfully",
          data: province,
        });
    } catch (error) {
      console.error(
        "UPDATE PROVINCE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to update province",
        });
    }
  }
);

// ==========================
// DELETE PROVINCE
// ADMIN ONLY
// ==========================
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const province =
        await Province.findById(
          req.params.id
        );

      if (!province) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Province not found",
          });
      }

      await Province.findByIdAndDelete(
        req.params.id
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Province deleted successfully",
        });
    } catch (error) {
      console.error(
        "DELETE PROVINCE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to delete province",
        });
    }
  }
);

module.exports = router;