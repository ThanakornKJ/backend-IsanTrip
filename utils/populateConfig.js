// utils/populateConfig.js

// =====================================================
// ================= USER POPULATE =====================
// =====================================================

const USER_SELECT = `
  fullName
  email
  profileImage
  userType
  facebookId
`;

// =====================================================
// ================= PLACE POPULATE ====================
// ใช้กับ PlaceModel:
// provinceId, categoryId, typeId ต้องเป็น object
// =====================================================

const PLACE_POPULATE = [
  {
    path: "provinceId",
    select: "name",
  },
  {
    path: "categoryId",
    select: "name",
  },
  {
    path: "typeId",
    select: "name",
  },
];

// =====================================================
// ============ PLACE INSIDE OTHER POPULATE ============
// ใช้ตอน populate tripPlaces.placeId, favorite.placeId
// =====================================================

const PLACE_DEEP_POPULATE = {
  path: "placeId",
  select: `
    placeName
    description
    address
    provinceId
    categoryId
    typeId
    location
    latitude
    longitude
    openingHours
    contact
    entranceFee
    socialMedia
    highlight
    travelInfo
    placeImages
    createdAt
    updatedAt
  `,
  populate: PLACE_POPULATE,
};

// =====================================================
// ================= FESTIVAL POPULATE =================
// ใช้กับ FestivalModel:
// provinceId ต้องเป็น object
// หมายเหตุ: festivalLocations ตอนนี้ใช้ latitude/longitude แล้ว
// จึงไม่ต้อง populate festivalLocations.placeId อีก
// =====================================================

const FESTIVAL_POPULATE = [
  {
    path: "provinceId",
    select: "name",
  },
];

// =====================================================
// =========== FESTIVAL INSIDE TRIP POPULATE ===========
// ใช้กับ tripFestivals.festivalId
// =====================================================

const FESTIVAL_IN_TRIP_POPULATE = {
  path: "tripFestivals.festivalId",
  select: `
    festivalName
    description
    startDate
    endDate
    provinceId
    festivalImages
    festivalLocations
    createdAt
    updatedAt
  `,
  populate: FESTIVAL_POPULATE,
};

// =====================================================
// ================= TRIP POPULATE =====================
// ใช้กับ TripModel:
// userId ต้องเป็น object
// tripPlaces.placeId ต้องเป็น object
// tripFestivals.festivalId ต้องเป็น object
// =====================================================

const TRIP_POPULATE = [
  {
    path: "userId",
    select: USER_SELECT,
  },
  {
    path: "tripPlaces.placeId",
    select: `
      placeName
      description
      address
      provinceId
      categoryId
      typeId
      location
      latitude
      longitude
      openingHours
      contact
      entranceFee
      socialMedia
      highlight
      travelInfo
      placeImages
      createdAt
      updatedAt
    `,
    populate: PLACE_POPULATE,
  },
  FESTIVAL_IN_TRIP_POPULATE,
];

// =====================================================
// ================= REVIEW POPULATE ===================
// ใช้กับ ReviewModel:
// userId ต้องเป็น object
// =====================================================

const REVIEW_POPULATE = [
  {
    path: "userId",
    select: USER_SELECT,
  },
];

// =====================================================
// ================= FAVORITE POPULATE =================
// ใช้กับ FavoriteModel เดิม ถ้ายังมี route ที่ต้องส่งแบบเต็ม
// =====================================================

const FAVORITE_POPULATE = [
  {
    path: "userId",
    select: USER_SELECT,
  },
  {
    path: "placeId",
    select: `
      placeName
      description
      address
      provinceId
      categoryId
      typeId
      location
      latitude
      longitude
      openingHours
      contact
      entranceFee
      socialMedia
      highlight
      travelInfo
      placeImages
      createdAt
      updatedAt
    `,
    populate: PLACE_POPULATE,
  },
];

module.exports = {
  USER_SELECT,
  PLACE_POPULATE,
  PLACE_DEEP_POPULATE,
  FESTIVAL_POPULATE,
  FESTIVAL_IN_TRIP_POPULATE,
  TRIP_POPULATE,
  REVIEW_POPULATE,
  FAVORITE_POPULATE,
};