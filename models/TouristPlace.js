const mongoose = require("mongoose");

const placeImageSchema = new mongoose.Schema({
  imageURL: String,
  isCover: Boolean,
});

// ---------------- ENUM DATA ----------------
const categories = [
  "",
  "สถานที่ใหม่",
  "ยอดนิยม",
  "แนะนำ",
];

const provinces = [
  "กาฬสินธุ์","ขอนแก่น","ชัยภูมิ","นครพนม","นครราชสีมา",
  "บึงกาฬ","บุรีรัมย์","มหาสารคาม","มุกดาหาร","ยโสธร",
  "ร้อยเอ็ด","เลย","ศรีสะเกษ","สกลนคร","สุรินทร์",
  "หนองคาย","หนองบัวลำภู","อำนาจเจริญ","อุดรธานี","อุบลราชธานี",
];

const touristTypes = [
  "ธรรมชาติ",
  "อุทยานแห่งชาติ",
  "น้ำตก",
  "จุดชมวิว",
  "ศาสนสถาน",
  "ประวัติศาสตร์",
  "พิพิธภัณฑ์",
  "สวนเกษตร",
  "นันทนาการ",
  "ชุมชนท่องเที่ยว",
  "วัฒนธรรม"
];

// ---------------- SCHEMA ----------------
const touristPlaceSchema = new mongoose.Schema(
  {
    placeName: { 
      type: String, 
      required: true 
    },

    description: String,

    address: String,

    province: {
      type: String,
      enum: provinces
    },

    latitude: Number,
    longitude: Number,

    openingHours: {
      type: String,
      trim: true
    },

    category: {
      type: String,
      enum: categories,
      default: ""
    },

    touristType: [{
      type: String,
      enum: touristTypes
    }],

    contact: String,

    entranceFee: String,

    socialMedia: String,

    highlight: String,

    travelInfo: String,

    placeImages: [placeImageSchema],
  },
  { timestamps: true }
);

touristPlaceSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("TouristPlace", touristPlaceSchema);