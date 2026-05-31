require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const passport = require("./config/passport");

// ==========================
// ROUTES
// ==========================
const authRoutes = require("./routes/auth");

const placeRoutes = require("./routes/place");

const festivalRoutes = require("./routes/festivals");

const tripRoutes = require("./routes/trips");

const adminRoutes = require("./routes/admin");

const favoriteRoutes = require("./routes/favorite");

const reviewRoutes = require("./routes/review");

const provinceRoutes = require("./routes/province");

// ==========================
// NEW ROUTES
// ==========================
const categoryRoutes = require(
  "./routes/category"
);

const placeTypeRoutes = require(
  "./routes/placeType"
);

// ==========================
// APP
// ==========================
const app = express();

const PORT =
  process.env.PORT || 3000;

// ==========================
// CONNECT DATABASE
// ==========================
mongoose
  .connect(
    process.env.MONGO_URI,
    {
      autoIndex: true,
    }
  )
  .then(() => {
    console.log(
      "Connected to MongoDB Atlas!"
    );
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error
    );
  });

// ==========================
// MIDDLEWARE
// ==========================
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(passport.initialize());

// ==========================
// STATIC FILES
// ==========================
app.use(
  "/uploads",
  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);

// ==========================
// API ROUTES
// ==========================
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/places",
  placeRoutes
);

app.use(
  "/api/festivals",
  festivalRoutes
);

app.use(
  "/api/trips",
  tripRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/favorites",
  favoriteRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/provinces",
  provinceRoutes
);

// ==========================
// NEW API ROUTES
// ==========================
app.use(
  "/api/category",
  categoryRoutes
);

app.use(
  "/api/placeType",
  placeTypeRoutes
);

// ==========================
// HEALTH CHECK
// ==========================
app.get(
  "/",
  (req, res) => {
    res.json({
      success: true,

      message:
        "API is running",

      environment:
        process.env
          .NODE_ENV ||
        "development",

      timestamp:
        new Date(),
    });
  }
);

// ==========================
// 404 HANDLER
// ==========================
app.use(
  (req, res) => {
    res
      .status(404)
      .json({
        success: false,

        message:
          "Route not found",

        path:
          req.originalUrl,
      });
  }
);

// ==========================
// GLOBAL ERROR HANDLER
// ==========================
app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "GLOBAL ERROR:",
      err
    );

    // multer error
    if (
      err.name ===
      "MulterError"
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            err.message,
        });
    }

    // mongoose invalid object id
    if (
      err.name ===
      "CastError"
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid ID format",
        });
    }

    // duplicate key
    if (
      err.code === 11000
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Duplicate data",
        });
    }

    return res
      .status(
        err.statusCode ||
          500
      )
      .json({
        success:
          false,

        message:
          err.message ||
          "Internal server error",
      });
  }
);

// ==========================
// START SERVER
// ==========================
app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `API URL: http://localhost:${PORT}/api`
    );
  }
);