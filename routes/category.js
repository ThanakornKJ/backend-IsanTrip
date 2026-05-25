const express = require("express");

const router = express.Router();

const Category = require("../models/Category");

router.get("/", async (req, res) => {
  try {

    const categories =
      await Category.find()
        .sort({
          name: 1,
        });

    res.json(categories);

  } catch (err) {

    console.error(
      "GET CATEGORIES ERROR:",
      err
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;