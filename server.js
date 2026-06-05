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
const categoryRoutes = require("./routes/category");
const placeTypeRoutes = require("./routes/placeType");

// ==========================
// APP
// ==========================
const app = express();

const PORT = process.env.PORT || 3000;

// ==========================
// CONNECT DATABASE
// ==========================
mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: true,
  })
  .then(() => {
    console.log("Connected to MongoDB Atlas!");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
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
  express.static(path.join(__dirname, "uploads"))
);

// ==========================
// PUBLIC META / FACEBOOK PAGES
// ==========================
// ใช้สำหรับกรอกใน Meta Developer:
// Privacy Policy URL:
// https://backend-isantrip.onrender.com/privacy-policy
//
// Terms of Service URL:
// https://backend-isantrip.onrender.com/terms
//
// Data Deletion Instructions URL:
// https://backend-isantrip.onrender.com/delete-data

app.get("/privacy-policy", (req, res) => {
  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>นโยบายความเป็นส่วนตัว - Isan Trip</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 40px auto;
            padding: 0 20px;
            color: #222;
            background: #ffffff;
          }

          h1, h2 {
            color: #1f2937;
          }

          h1 {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
          }

          p, li {
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>นโยบายความเป็นส่วนตัวของ Isan Trip</h1>

        <p>
          แอปพลิเคชัน Isan Trip เป็นแอปสำหรับให้ข้อมูลสถานที่ท่องเที่ยว
          เทศกาล ประเพณี ทริปท่องเที่ยว รีวิว และข้อมูลที่เกี่ยวข้องกับการเดินทางในภาคอีสาน
        </p>

        <h2>1. ข้อมูลที่เราเก็บรวบรวม</h2>
        <p>
          เราอาจเก็บข้อมูลที่จำเป็นต่อการให้บริการ เช่น ชื่อ อีเมล รูปโปรไฟล์
          ข้อมูลบัญชี Facebook สำหรับการเข้าสู่ระบบ รายการโปรด รีวิว รูปภาพที่ผู้ใช้อัปโหลด
          และข้อมูลอื่น ๆ ที่ผู้ใช้ให้ไว้ภายในแอป
        </p>

        <h2>2. การเข้าสู่ระบบผ่าน Facebook</h2>
        <p>
          เมื่อผู้ใช้เลือกเข้าสู่ระบบผ่าน Facebook แอปอาจขอข้อมูลพื้นฐานจาก Facebook
          เช่น ชื่อ อีเมล และรูปโปรไฟล์ เพื่อนำมาใช้สร้างบัญชีหรือเข้าสู่ระบบ Isan Trip
        </p>

        <h2>3. วัตถุประสงค์ในการใช้ข้อมูล</h2>
        <p>
          ข้อมูลของผู้ใช้จะถูกใช้เพื่อยืนยันตัวตน แสดงข้อมูลโปรไฟล์
          จัดการรายการโปรด รีวิว ทริป และปรับปรุงประสบการณ์การใช้งานแอป
        </p>

        <h2>4. การเปิดเผยข้อมูล</h2>
        <p>
          เราจะไม่ขายหรือให้เช่าข้อมูลส่วนบุคคลของผู้ใช้แก่บุคคลที่สาม
          เว้นแต่เป็นกรณีที่จำเป็นต่อการให้บริการ การปฏิบัติตามกฎหมาย
          หรือได้รับความยินยอมจากผู้ใช้
        </p>

        <h2>5. การดูแลรักษาข้อมูล</h2>
        <p>
          เราจะใช้มาตรการที่เหมาะสมเพื่อป้องกันการเข้าถึง ใช้ หรือเปิดเผยข้อมูลโดยไม่ได้รับอนุญาต
        </p>

        <h2>6. การลบข้อมูล</h2>
        <p>
          ผู้ใช้สามารถขอลบข้อมูลบัญชีและข้อมูลที่เกี่ยวข้องได้ตามขั้นตอนที่ระบุไว้ในหน้า
          คำแนะนำการลบข้อมูลผู้ใช้
        </p>

        <h2>7. การติดต่อ</h2>
        <p>
          หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว สามารถติดต่อได้ที่:
          <strong>artyjj11@gmail.com</strong>
        </p>
      </body>
    </html>
  `);
});

app.get("/terms", (req, res) => {
  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ข้อกำหนดการใช้งาน - Isan Trip</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 40px auto;
            padding: 0 20px;
            color: #222;
            background: #ffffff;
          }

          h1, h2 {
            color: #1f2937;
          }

          h1 {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
          }

          p, li {
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>ข้อกำหนดการใช้งานของ Isan Trip</h1>

        <p>
          การใช้งานแอปพลิเคชัน Isan Trip ถือว่าผู้ใช้ยอมรับข้อกำหนดและเงื่อนไขเหล่านี้
        </p>

        <h2>1. การใช้งานแอป</h2>
        <p>
          ผู้ใช้ตกลงที่จะใช้แอปเพื่อวัตถุประสงค์ที่ถูกต้องตามกฎหมาย
          และไม่กระทำการใด ๆ ที่อาจก่อให้เกิดความเสียหายต่อระบบ ผู้ให้บริการ หรือผู้ใช้อื่น
        </p>

        <h2>2. บัญชีผู้ใช้</h2>
        <p>
          ผู้ใช้มีหน้าที่ดูแลความถูกต้องของข้อมูลบัญชีและความปลอดภัยของการใช้งานบัญชีของตนเอง
        </p>

        <h2>3. การเข้าสู่ระบบผ่าน Facebook</h2>
        <p>
          ผู้ใช้สามารถเข้าสู่ระบบด้วย Facebook ได้ โดยแอปจะใช้ข้อมูลพื้นฐานที่จำเป็น
          เพื่อสร้างหรือเข้าสู่ระบบบัญชี Isan Trip
        </p>

        <h2>4. เนื้อหาจากผู้ใช้</h2>
        <p>
          ผู้ใช้อาจสามารถโพสต์รีวิว รูปภาพ หรือข้อมูลอื่น ๆ ภายในแอปได้
          โดยเนื้อหาดังกล่าวต้องไม่ผิดกฎหมาย ไม่ละเมิดสิทธิของผู้อื่น
          และไม่เป็นเนื้อหาที่ไม่เหมาะสม
        </p>

        <h2>5. การจัดการเนื้อหา</h2>
        <p>
          Isan Trip ขอสงวนสิทธิ์ในการแก้ไข ซ่อน หรือลบเนื้อหาที่ไม่เหมาะสม
          หรือขัดต่อข้อกำหนดการใช้งาน
        </p>

        <h2>6. การเปลี่ยนแปลงบริการ</h2>
        <p>
          Isan Trip อาจปรับปรุง เปลี่ยนแปลง หรือยกเลิกบางส่วนของบริการได้ตามความเหมาะสม
        </p>

        <h2>7. การติดต่อ</h2>
        <p>
          หากมีคำถามเกี่ยวกับข้อกำหนดการใช้งาน สามารถติดต่อได้ที่:
          <strong>artyjj11@gmail.com</strong>
        </p>
      </body>
    </html>
  `);
});

app.get("/delete-data", (req, res) => {
  res.type("html").send(`
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>คำแนะนำการลบข้อมูลผู้ใช้ - Isan Trip</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 40px auto;
            padding: 0 20px;
            color: #222;
            background: #ffffff;
          }

          h1, h2 {
            color: #1f2937;
          }

          h1 {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 12px;
          }

          p, li {
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>คำแนะนำการลบข้อมูลผู้ใช้ของ Isan Trip</h1>

        <p>
          ผู้ใช้สามารถขอลบข้อมูลบัญชีและข้อมูลที่เกี่ยวข้องกับการใช้งานแอป Isan Trip ได้
        </p>

        <h2>1. วิธีการขอลบข้อมูล</h2>
        <p>
          กรุณาส่งคำขอลบข้อมูลมาที่อีเมล:
          <strong>artyjj11@gmail.com</strong>
        </p>

        <p>โดยระบุข้อมูลดังต่อไปนี้:</p>

        <ul>
          <li>ชื่อบัญชีผู้ใช้</li>
          <li>อีเมลที่ใช้สมัครหรือเข้าสู่ระบบ</li>
          <li>แจ้งว่าต้องการลบข้อมูลบัญชี Isan Trip</li>
        </ul>

        <h2>2. ข้อมูลที่อาจถูกลบ</h2>
        <p>
          ข้อมูลที่อาจถูกลบประกอบด้วย ข้อมูลบัญชีผู้ใช้ ข้อมูล Facebook Login ที่เชื่อมโยงกับบัญชี
          รายการโปรด รีวิว รูปภาพ และข้อมูลอื่น ๆ ที่เกี่ยวข้องกับบัญชีผู้ใช้
        </p>

        <h2>3. ระยะเวลาดำเนินการ</h2>
        <p>
          ทีมงานจะตรวจสอบและดำเนินการลบข้อมูลภายในระยะเวลาที่เหมาะสมหลังจากได้รับคำขอ
        </p>

        <h2>4. การติดต่อ</h2>
        <p>
          หากมีคำถามเพิ่มเติม สามารถติดต่อได้ที่:
          <strong>artyjj11@gmail.com</strong>
        </p>
      </body>
    </html>
  `);
});

app.get("/privacy-policy/", (req, res) => {
  res.redirect(301, "/privacy-policy");
});

app.get("/terms/", (req, res) => {
  res.redirect(301, "/terms");
});

app.get("/delete-data/", (req, res) => {
  res.redirect(301, "/delete-data");
});

// ==========================
// API ROUTES
// ==========================
app.use("/api/auth", authRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/festivals", festivalRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/provinces", provinceRoutes);

// ==========================
// NEW API ROUTES
// ==========================
app.use("/api/category", categoryRoutes);
app.use("/api/placeType", placeTypeRoutes);

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date(),
  });
});

// ==========================
// 404 HANDLER
// ==========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ==========================
// GLOBAL ERROR HANDLER
// ==========================
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  // multer error
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // mongoose invalid object id
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate data",
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ==========================
// START SERVER
// ==========================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
});