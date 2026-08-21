/**
 * Analytics Routes
 * Analytics and reporting endpoints
 */

const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");

const {
  trackEvent,
  getDashboardStats,
  getSalesAnalytics,
  getUserAnalytics,
  getProductAnalytics,
  getRealtimeStats,
  getPageviewAnalytics,
  getConversionAnalytics,
  exportReport,
} = require("../controllers/analyticsController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const trackEventValidation = [
  body("type").notEmpty().withMessage("Event type is required"),
  body("type")
    .isIn([
      "pageview",
      "product-view",
      "search",
      "add-to-cart",
      "remove-from-cart",
      "checkout",
      "order",
      "payment",
      "user-registration",
      "user-login",
      "user-logout",
      "banner-click",
      "coupon-use",
      "review",
      "share",
      "wishlist-add",
      "wishlist-remove",
      "click",
      "conversion",
    ])
    .withMessage("Invalid event type"),
];

const periodValidation = [
  query("period")
    .optional()
    .isIn(["7d", "30d", "90d", "365d"])
    .withMessage("Invalid period"),
];

const exportValidation = [
  query("type").notEmpty().withMessage("Report type is required"),
  query("type")
    .isIn(["sales", "users", "products", "inventory", "conversion"])
    .withMessage("Invalid report type"),
  query("startDate").isISO8601().withMessage("Invalid start date"),
  query("endDate").isISO8601().withMessage("Invalid end date"),
  query("startDate").custom((value, { req }) => {
    if (new Date(value) > new Date(req.query.endDate)) {
      throw new Error("Start date must be before end date");
    }
    return true;
  }),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   POST /api/v1/analytics/track
 * @desc    Track event
 * @access  Public
 */
router.post("/track", trackEventValidation, validate, trackEvent);

// ==========================================
// ADMIN ANALYTICS ROUTES
// ==========================================

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard stats (Admin)
 * @access  Private/Admin
 */
router.get("/dashboard", protect, adminOnly, getDashboardStats);

/**
 * @route   GET /api/v1/analytics/sales
 * @desc    Get sales analytics (Admin)
 * @access  Private/Admin
 */
router.get(
  "/sales",
  protect,
  adminOnly,
  periodValidation,
  validate,
  getSalesAnalytics,
);

/**
 * @route   GET /api/v1/analytics/users
 * @desc    Get user analytics (Admin)
 * @access  Private/Admin
 */
router.get(
  "/users",
  protect,
  adminOnly,
  periodValidation,
  validate,
  getUserAnalytics,
);

/**
 * @route   GET /api/v1/analytics/products
 * @desc    Get product analytics (Admin)
 * @access  Private/Admin
 */
router.get(
  "/products",
  protect,
  adminOnly,
  periodValidation,
  validate,
  getProductAnalytics,
);

/**
 * @route   GET /api/v1/analytics/realtime
 * @desc    Get real-time stats (Admin)
 * @access  Private/Admin
 */
router.get("/realtime", protect, adminOnly, getRealtimeStats);

/**
 * @route   GET /api/v1/analytics/pageviews
 * @desc    Get pageview analytics (Admin)
 * @access  Private/Admin
 */
router.get(
  "/pageviews",
  protect,
  adminOnly,
  periodValidation,
  validate,
  getPageviewAnalytics,
);

/**
 * @route   GET /api/v1/analytics/conversions
 * @desc    Get conversion analytics (Admin)
 * @access  Private/Admin
 */
router.get(
  "/conversions",
  protect,
  adminOnly,
  periodValidation,
  validate,
  getConversionAnalytics,
);

/**
 * @route   GET /api/v1/analytics/export
 * @desc    Export report (Admin)
 * @access  Private/Admin
 */
router.get(
  "/export",
  protect,
  adminOnly,
  exportValidation,
  validate,
  exportReport,
);

module.exports = router;


