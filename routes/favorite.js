const express =
  require("express");

const router =
  express.Router();

const Favorite =
  require("../models/Favorite");

const TouristPlace =
  require("../models/TouristPlace");

const protect =
  require(
    "../middleware/authMiddleware"
  );

// =====================================================
// ================= GET FAVORITES =====================
// =====================================================

router.get(
  "/",
  protect,
  async (req, res) => {
    try {
      const favorites =
        await Favorite.find({
          userId: req.user._id,
        })
          .populate({
            path: "placeId",
            select:
              "placeName provinceId placeImages latitude longitude",
            populate: {
              path: "provinceId",
              select: "name",
            },
          })
          .sort({
            createdAt: -1,
          })
          .lean();

      const formatted =
        favorites
          .filter(
            (fav) => fav.placeId
          )
          .map((fav) => {
            const place =
              fav.placeId;

            const coverImage =
              place.placeImages?.find(
                (img) =>
                  img.isCover
              ) ||
              place.placeImages?.[0];

            return {
              _id:
                place._id,

              favoriteId:
                fav._id,

              name:
                place.placeName,

              province:
                place.provinceId
                  ?.name || "",

              latitude:
                place.latitude,

              longitude:
                place.longitude,

              image:
                coverImage
                  ?.imageURL
                  ? `${req.protocol}://${req.get(
                      "host"
                    )}/${
                      coverImage.imageURL
                    }`
                  : "",

              distance: "-",
            };
          });

      res.json(
        formatted
      );

    } catch (err) {
      console.error(
        "GET FAVORITES ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// ================= ADD FAVORITE ======================
// =====================================================

router.post(
  "/:placeId",
  protect,
  async (req, res) => {
    try {
      const place =
        await TouristPlace.findById(
          req.params.placeId
        );

      if (!place) {
        return res
          .status(404)
          .json({
            message:
              "Place not found",
          });
      }

      await Favorite.create({
        userId:
          req.user._id,

        placeId:
          req.params
            .placeId,
      });

      res.json({
        message:
          "Added to favorites",
      });

    } catch (err) {

      // duplicate favorite
      if (
        err.code === 11000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Already favorite",
          });
      }

      console.error(
        "ADD FAVORITE ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// ================= REMOVE FAVORITE ===================
// =====================================================

router.delete(
  "/:placeId",
  protect,
  async (req, res) => {
    try {
      await Favorite.findOneAndDelete(
        {
          userId:
            req.user._id,

          placeId:
            req.params
              .placeId,
        }
      );

      res.json({
        message:
          "Favorite removed",
      });

    } catch (err) {
      console.error(
        "REMOVE FAVORITE ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// ================= CHECK FAVORITE ====================
// =====================================================

router.get(
  "/check/:placeId",
  protect,
  async (req, res) => {
    try {
      const favorite =
        await Favorite.findOne(
          {
            userId:
              req.user
                ._id,

            placeId:
              req.params
                .placeId,
          }
        );

      res.json({
        isFavorite:
          !!favorite,
      });

    } catch (err) {
      console.error(
        "CHECK FAVORITE ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

module.exports = router;