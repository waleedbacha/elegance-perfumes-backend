const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const {
  getPublicSettings,
  getPublicSetting,
  getAllSettings,
  getSetting,
  setSetting,
  uploadSettingImage,
  bulkUpdateSettings,
  deleteSetting,
  initCategorySettings,
  initCollectionSettings,
  initShopSettings,
  initAboutSettings,
} = require("../controllers/settingController");

// ==========================================
// VALIDATION
// ==========================================

const setSettingValidation = [
  body("key").notEmpty().withMessage("Key is required"),
  body("value").optional(), // ✅ Make value optional
  body("type")
    .optional()
    .isIn(["string", "number", "boolean", "object", "array", "image"])
    .withMessage("Invalid type"),
  body("group")
    .optional()
    .isIn([
      "general",
      "category",
      "collection",
      "shop",
      "about",
      "hero",
      "banner",
      "seo",
    ])
    .withMessage("Invalid group"),
];

const bulkUpdateValidation = [
  body("settings").isArray().withMessage("Settings must be an array"),
  body("settings.*.key").notEmpty().withMessage("Key is required"),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   GET /api/v1/settings/public/:group
 * @desc    Get public settings by group
 * @access  Public
 */
router.get("/public/:group", getPublicSettings);

/**
 * @route   GET /api/v1/settings/public/single/:key
 * @desc    Get single public setting
 * @access  Public
 */
router.get("/public/single/:key", getPublicSetting);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @route   GET /api/v1/settings/admin/all
 * @desc    Get all settings
 * @access  Private/Admin
 */
router.get("/admin/all", protect, adminOnly, getAllSettings);

/**
 * @route   GET /api/v1/settings/admin/:key
 * @desc    Get setting by key
 * @access  Private/Admin
 */
router.get("/admin/:key", protect, adminOnly, getSetting);

/**
 * @route   POST /api/v1/settings/admin/set
 * @desc    Create or update setting
 * @access  Private/Admin
 */
router.post(
  "/admin/set",
  protect,
  adminOnly,
  setSettingValidation,
  validate,
  setSetting,
);

/**
 * @route   POST /api/v1/settings/admin/upload-image
 * @desc    Upload image for setting
 * @access  Private/Admin
 */
router.post(
  "/admin/upload-image",
  protect,
  adminOnly,
  upload.single("image"),
  uploadSettingImage,
);

/**
 * @route   POST /api/v1/settings/admin/bulk
 * @desc    Bulk update settings
 * @access  Private/Admin
 */
router.post(
  "/admin/bulk",
  protect,
  adminOnly,
  bulkUpdateValidation,
  validate,
  bulkUpdateSettings,
);

/**
 * @route   DELETE /api/v1/settings/admin/:key
 * @desc    Delete setting
 * @access  Private/Admin
 */
router.delete("/admin/:key", protect, adminOnly, deleteSetting);

/**
 * @route   POST /api/v1/settings/admin/init/category
 * @desc    Initialize category settings
 * @access  Private/Admin
 */
router.post("/admin/init/category", protect, adminOnly, initCategorySettings);

/**
 * @route   POST /api/v1/settings/admin/init/collection
 * @desc    Initialize collection settings
 * @access  Private/Admin
 */
router.post(
  "/admin/init/collection",
  protect,
  adminOnly,
  initCollectionSettings,
);

/**
 * @route   POST /api/v1/settings/admin/init/shop
 * @desc    Initialize shop settings
 * @access  Private/Admin
 */
router.post("/admin/init/shop", protect, adminOnly, initShopSettings);

/**
 * @route   POST /api/v1/settings/admin/init/about
 * @desc    Initialize about page settings
 * @access  Private/Admin
 */
router.post("/admin/init/about", protect, adminOnly, initAboutSettings);

module.exports = router;
