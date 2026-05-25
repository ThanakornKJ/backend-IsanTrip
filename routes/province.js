const express = require("express");
const router = express.Router();

const Province = require("../models/Province");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// =====================================================
// ================= HELPER =============================
// =====================================================

const normalizeProvinceName = (name = "") => {
  return name.trim();
};

const buildProvinceResponse = (province) => {
  return {
    _id: province._id,
    name: province.name,
    createdAt: province.createdAt,
    updatedAt: province.updatedAt,
  };
};

// =====================================================
// ================= GET ALL PROVINCES =================
// =====================================================

router.get("/", async (req, res) => {
  try {
    const { keyword } = req.query;

    const filter = {};

    // ================= SEARCH =================
    if (keyword) {
      filter.name = {
        $regex: keyword.trim(),
        $options: "i",
      };
    }

    const provinces = await Province.find(filter)
      .sort({
        name: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: provinces.length,
      data: provinces.map(buildProvinceResponse),
    });

  } catch (err) {
    console.error(
      "GET PROVINCES ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provinces",
    });
  }
});

// =====================================================
// ================= GET PROVINCE BY ID ================
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const province =
      await Province.findById(
        req.params.id
      ).lean();

    if (!province) {
      return res.status(404).json({
        success: false,
        message: "Province not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: buildProvinceResponse(
        province
      ),
    });

  } catch (err) {
    console.error(
      "GET PROVINCE ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch province",
    });
  }
});

// =====================================================
// ================= CREATE PROVINCE ===================
// =====================================================

router.post(
  "/",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      let { name } = req.body;

      name =
        normalizeProvinceName(name);

      // ================= VALIDATION =================
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "name is required",
        });
      }

      // ================= DUPLICATE CHECK =================
      const exists =
        await Province.findOne({
          name: {
            $regex: `^${name}$`,
            $options: "i",
          },
        });

      if (exists) {
        return res.status(409).json({
          success: false,
          message:
            "Province already exists",
        });
      }

      // ================= CREATE =================
      const province =
        await Province.create({
          name,
        });

      return res.status(201).json({
        success: true,
        message:
          "Province created successfully",
        data: buildProvinceResponse(
          province
        ),
      });

    } catch (err) {
      console.error(
        "CREATE PROVINCE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create province",
      });
    }
  }
);

// =====================================================
// ================= UPDATE PROVINCE ===================
// =====================================================

router.put(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      let { name } = req.body;

      const province =
        await Province.findById(
          req.params.id
        );

      if (!province) {
        return res.status(404).json({
          success: false,
          message:
            "Province not found",
        });
      }

      // ================= UPDATE NAME =================
      if (name !== undefined) {

        name =
          normalizeProvinceName(name);

        if (!name) {
          return res.status(400).json({
            success: false,
            message:
              "name is required",
          });
        }

        const duplicate =
          await Province.findOne({
            _id: {
              $ne: req.params.id,
            },

            name: {
              $regex: `^${name}$`,
              $options: "i",
            },
          });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              "Province already exists",
          });
        }

        province.name = name;
      }

      await province.save();

      return res.status(200).json({
        success: true,
        message:
          "Province updated successfully",
        data: buildProvinceResponse(
          province
        ),
      });

    } catch (err) {
      console.error(
        "UPDATE PROVINCE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update province",
      });
    }
  }
);

// =====================================================
// ================= DELETE PROVINCE ===================
// =====================================================

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const province =
        await Province.findById(
          req.params.id
        );

      if (!province) {
        return res.status(404).json({
          success: false,
          message:
            "Province not found",
        });
      }

      await province.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Province deleted successfully",
      });

    } catch (err) {
      console.error(
        "DELETE PROVINCE ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete province",
      });
    }
  }
);

module.exports = router;