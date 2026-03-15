require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require("./routes/auth");
const passport = require("./config/passport");
const placeRoutes = require("./routes/place");
const festivalRoutes = require('./routes/festivals');
const tripRoutes = require("./routes/trips");
const adminRoutes = require("./routes/admin");
const favoriteRoutes = require("./routes/favorite");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= CONNECT MONGODB =================
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB Atlas!'))
.catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

// ================= MIDDLEWARE =================
app.use(cors()); // 🔥 สำคัญมาก
app.use(express.json());
app.use(passport.initialize());

// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/festivals", festivalRoutes);
app.use("/api/trips", tripRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoriteRoutes);


// ================= TEST ROUTE =================
app.get('/', (req, res) => {
    res.send('API is running...');
});

// ================= START SERVER =================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});