require("dotenv")
  .config();

const express =
  require(
    "express"
  );
const mongoose =
  require(
    "mongoose"
  );
const cors =
  require("cors");

const passport =
  require(
    "./config/passport"
  );

// ==========================
// ROUTES
// ==========================
const authRoutes =
  require(
    "./routes/auth"
  );

const placeRoutes =
  require(
    "./routes/place"
  );

const festivalRoutes =
  require(
    "./routes/festivals"
  );

const tripRoutes =
  require(
    "./routes/trips"
  );

const adminRoutes =
  require(
    "./routes/admin"
  );

const favoriteRoutes =
  require(
    "./routes/favorite"
  );

const reviewRoutes =
  require(
    "./routes/review"
  );

const provinceRoutes =
  require(
    "./routes/province"
  );

// ==========================
// APP
// ==========================
const app =
  express();

const PORT =
  process.env
    .PORT || 3000;

// ==========================
// CONNECT DATABASE
// ==========================
mongoose
  .connect(
    process.env
      .MONGO_URI
  )
  .then(() => {
    console.log(
      "Connected to MongoDB Atlas!"
    );
  })
  .catch(
    (error) => {
      console.error(
        "MongoDB connection error:",
        error
      );
    }
  );

// ==========================
// MIDDLEWARE
// ==========================
app.use(
  cors()
);

app.use(
  express.json()
);

app.use(
  express.urlencoded(
    {
      extended:
        true,
    }
  )
);

app.use(
  passport.initialize()
);

// ==========================
// STATIC FILES
// ==========================
app.use(
  "/uploads",
  express.static(
    "uploads"
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
// HEALTH CHECK
// ==========================
app.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      success:
        true,
      message:
        "API is running",
    });
  }
);

// ==========================
// 404 HANDLER
// ==========================
app.use(
  (
    req,
    res
  ) => {
    res
      .status(404)
      .json({
        success:
          false,
        message:
          "Route not found",
      });
  }
);

// ==========================
// GLOBAL ERROR
// ==========================
app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      err
    );

    return res
      .status(
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
  }
);