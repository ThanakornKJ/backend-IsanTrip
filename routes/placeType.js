const express = require("express");

const router = express.Router();

const PlaceType = require("../models/PlaceType");

router.get("/", async (req, res) => {
  try {

    const types =
      await PlaceType.find()
        .sort({
          name: 1,
        });

    res.json(types);

  } catch (err) {

    console.error(
      "GET PLACE TYPES ERROR:",
      err
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;