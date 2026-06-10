const express = require("express");

const router = express.Router();

const FestivalType = require("../models/FestivalType");

router.get("/", async (req, res) => {
  try {
    const festivalTypes =
      await FestivalType.find()
        .sort({
          name: 1,
        });

    res.json(festivalTypes);
  } catch (err) {
    console.error(
      "GET FESTIVAL TYPES ERROR:",
      err
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;