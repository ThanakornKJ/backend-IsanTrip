const express  = require("express");
const router   = express.Router();
const Province = require("../models/Province");
const protect  = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

// GET ALL
router.get("/", async (req, res) => {
  try {
    const provinces = await Province.find().sort({ name: 1 });
    res.json(provinces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE (ADMIN)
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name } = req.body;
    const prov = await Province.create({ name });
    res.status(201).json(prov);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "จังหวัดนี้มีอยู่แล้ว" });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE (ADMIN)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Province.findByIdAndDelete(req.params.id);
    res.json({ message: "ลบสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;