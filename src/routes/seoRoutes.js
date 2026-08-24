const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");

const {
  getSeoSettings,
  updateGlobalSettings,
  updatePageSettings,
  updateProductTemplates,
  updateCategoryTemplates,
  updateSitemapSettings,
  generateSitemap,
  generateRobots,
  updateSocialSettings,
  addCustomPage,
  updateCustomPage,
  deleteCustomPage,
  runSeoAudit,
  getSeoPreview,
  bulkUpdateProductSeo,
  getSeoHistory,
  resetToDefaults,
  getSeoDashboard,
  getKeywordRankings,
  getKeywordSuggestions,
  checkKeywordCannibalization,
  analyzeKeywordDifficulty,
} = require("../controllers/seoController");

// ============================================
// VALIDATION
// ============================================

const updateGlobalValidation = [
  body("global.site_name").optional().isString().trim(),
  body("global.site_description").optional().isString().trim(),
  body("global.site_keywords").optional().isString().trim(),
  body("global.default_og_image").optional().isString().trim(),
  body("global.twitter_handle").optional().isString().trim(),
  body("global.google_analytics_id")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body("global.google_tag_manager_id")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body("global.facebook_pixel_id")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body("global.google_verification")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body("global.bing_verification")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
  body("global.robots.index").optional().isBoolean(),
  body("global.robots.follow").optional().isBoolean(),
  body("global.robots.advanced")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim(),
];

const updatePageValidation = [
  body("data.title").optional().isString().trim(),
  body("data.description").optional().isString().trim(),
  body("data.keywords").optional().isString().trim(),
  body("data.og_image").optional().isString().trim(),
  body("data.canonical").optional().isString().trim(),
  body("data.no_index").optional().isBoolean(),
  body("data.no_follow").optional().isBoolean(),
];

const customPageValidation = [
  body("route").notEmpty().withMessage("Route is required").trim(),
  body("title").notEmpty().withMessage("Title is required").trim(),
  body("description").notEmpty().withMessage("Description is required").trim(),
  body("keywords").optional().isString().trim(),
  body("og_image").optional().isString().trim(),
  body("canonical").optional().isString().trim(),
  body("no_index").optional().isBoolean(),
  body("no_follow").optional().isBoolean(),
  body("priority").optional().isNumeric().isFloat({ min: 0, max: 1 }),
  body("changefreq")
    .optional()
    .isIn([
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ]),
];

const bulkUpdateValidation = [
  body("productIds").isArray().withMessage("Product IDs must be an array"),
  body("productIds.*").isMongoId().withMessage("Invalid product ID"),
  body("field")
    .isIn(["metaTitle", "metaDescription", "metaKeywords"])
    .withMessage("Invalid field"),
  body("value").notEmpty().withMessage("Value is required"),
];

// ============================================
// PUBLIC ROUTES
// ============================================

router.get("/sitemap.xml", generateSitemap);
router.get("/robots.txt", generateRobots);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all settings
router.get("/settings", protect, adminOnly, getSeoSettings);

// Global settings
router.put(
  "/settings/global",
  protect,
  adminOnly,
  updateGlobalValidation,
  validate,
  updateGlobalSettings,
);

// Page settings
router.put(
  "/settings/page/:page",
  protect,
  adminOnly,
  updatePageValidation,
  validate,
  updatePageSettings,
);

// Product templates
router.put(
  "/settings/product-templates",
  protect,
  adminOnly,
  updateProductTemplates,
);

// Category templates
router.put(
  "/settings/category-templates",
  protect,
  adminOnly,
  updateCategoryTemplates,
);

// Sitemap settings
router.put("/settings/sitemap", protect, adminOnly, updateSitemapSettings);

// Social settings
router.put("/settings/social", protect, adminOnly, updateSocialSettings);

// Custom pages
router.post(
  "/custom-pages",
  protect,
  adminOnly,
  customPageValidation,
  validate,
  addCustomPage,
);

router.put(
  "/custom-pages/:route",
  protect,
  adminOnly,
  customPageValidation,
  validate,
  updateCustomPage,
);

router.delete("/custom-pages/:route", protect, adminOnly, deleteCustomPage);

// SEO Preview
router.get("/preview", protect, adminOnly, getSeoPreview);

// SEO Audit
router.post("/audit", protect, adminOnly, runSeoAudit);

// Bulk update products
router.put(
  "/bulk-update",
  protect,
  adminOnly,
  bulkUpdateValidation,
  validate,
  bulkUpdateProductSeo,
);

// SEO History
router.get("/history", protect, adminOnly, getSeoHistory);

// Reset to defaults
router.post("/reset", protect, adminOnly, resetToDefaults);

// backend/src/routes/seoRoutes.js
// Add these routes

// ============================================
// SEO DASHBOARD & ANALYTICS ROUTES
// ============================================

/**
 * @route   GET /api/v1/seo/dashboard
 * @desc    Get complete SEO dashboard data
 * @access  Private/Admin
 */
router.get("/dashboard", protect, adminOnly, getSeoDashboard);

/**
 * @route   GET /api/v1/seo/rankings
 * @desc    Get keyword rankings
 * @access  Private/Admin
 */
router.get("/rankings", protect, adminOnly, getKeywordRankings);

/**
 * @route   GET /api/v1/seo/keyword-suggestions
 * @desc    Get keyword suggestions
 * @access  Private/Admin
 */
router.get("/keyword-suggestions", protect, adminOnly, getKeywordSuggestions);

/**
 * @route   GET /api/v1/seo/cannibalization
 * @desc    Check keyword cannibalization
 * @access  Private/Admin
 */
router.get("/cannibalization", protect, adminOnly, checkKeywordCannibalization);

/**
 * @route   GET /api/v1/seo/keyword-difficulty
 * @desc    Analyze keyword difficulty
 * @access  Private/Admin
 */
router.get("/keyword-difficulty", protect, adminOnly, analyzeKeywordDifficulty);

module.exports = router;
