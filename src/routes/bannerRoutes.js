/**
 * Banner Routes
 * Banner management endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const {
  getActiveBanners,
  getBannersForSection,
  recordImpression,
  recordClick,
  createBanner,
  getAllBanners,
  getBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  getBannerAnalytics,
} = require("../controllers/bannerController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const bannerValidation = [
  body("title").notEmpty().withMessage("Banner title is required"),
  body("position")
    .isIn(["hero", "category", "promo", "sidebar", "footer", "popup"])
    .withMessage("Invalid position"),
  body("section")
    .optional()
    .isIn(["homepage", "shop", "category", "product", "checkout"])
    .withMessage("Invalid section"),
  body("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be 0 or greater"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Invalid status"),
  body("startDate").optional().isISO8601().withMessage("Invalid start date"),
  body("endDate").optional().isISO8601().withMessage("Invalid end date"),
];

const bannerUpdateValidation = [
  body("title")
    .optional()
    .notEmpty()
    .withMessage("Banner title cannot be empty"),
  body("position")
    .optional()
    .isIn(["hero", "category", "promo", "sidebar", "footer", "popup"])
    .withMessage("Invalid position"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Invalid status"),
];

const reorderValidation = [
  body("order").isArray().withMessage("Order must be an array"),
  body("order.*.id").isMongoId().withMessage("Invalid banner ID"),
  body("order.*.position")
    .isInt({ min: 0 })
    .withMessage("Position must be 0 or greater"),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   GET /api/v1/banners/active
 * @desc    Get active banners
 * @access  Public
 */
router.get("/active", getActiveBanners);

/**
 * @route   GET /api/v1/banners/section/:section
 * @desc    Get banners for section
 * @access  Public
 */
router.get("/section/:section", getBannersForSection);

/**
 * @route   POST /api/v1/banners/:id/impression
 * @desc    Record banner impression
 * @access  Public
 */
router.post("/:id/impression", recordImpression);

/**
 * @route   POST /api/v1/banners/:id/click
 * @desc    Record banner click
 * @access  Public
 */
router.post("/:id/click", recordClick);

// ==========================================
// ADMIN BANNER ROUTES
// ==========================================

/**
 * @route   POST /api/v1/banners
 * @desc    Create banner (Admin)
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  bannerValidation,
  validate,
  createBanner,
);

/**
 * @route   GET /api/v1/banners
 * @desc    Get all banners (Admin)
 * @access  Private/Admin
 */
router.get("/", protect, adminOnly, getAllBanners);

/**
 * @route   GET /api/v1/banners/analytics
 * @desc    Get banner analytics (Admin)
 * @access  Private/Admin
 */
router.get("/analytics", protect, adminOnly, getBannerAnalytics);

/**
 * @route   GET /api/v1/banners/:id
 * @desc    Get single banner (Admin)
 * @access  Private/Admin
 */
router.get("/:id", protect, adminOnly, getBanner);

/**
 * @route   PUT /api/v1/banners/:id
 * @desc    Update banner (Admin)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.single("image"),
  bannerUpdateValidation,
  validate,
  updateBanner,
);

/**
 * @route   DELETE /api/v1/banners/:id
 * @desc    Delete banner (Admin)
 * @access  Private/Admin
 */
router.delete("/:id", protect, adminOnly, deleteBanner);

/**
 * @route   POST /api/v1/banners/reorder
 * @desc    Reorder banners (Admin)
 * @access  Private/Admin
 */
router.post(
  "/reorder",
  protect,
  adminOnly,
  reorderValidation,
  validate,
  reorderBanners,
);

module.exports = router;


