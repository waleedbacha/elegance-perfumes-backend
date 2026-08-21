/**
 * Wishlist Routes
 * User wishlist endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect } = require("../middleware/auth");

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  checkWishlist,
  bulkCheckWishlist,
  setPriceDropNotification,
  setBackInStockNotification,
  getPriceDropItems,
  getWishlistStats,
} = require("../controllers/wishlistController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const productIdValidation = [
  body("productId").isMongoId().withMessage("Invalid product ID"),
];

const bulkCheckValidation = [
  body("productIds").isArray().withMessage("Product IDs must be an array"),
  body("productIds.*").isMongoId().withMessage("Invalid product ID"),
];

const notificationValidation = [
  body("productId").isMongoId().withMessage("Invalid product ID"),
  body("notify").isBoolean().withMessage("Notify must be a boolean"),
];

// ==========================================
// WISHLIST ROUTES
// ==========================================

/**
 * @route   GET /api/v1/wishlist
 * @desc    Get user wishlist
 * @access  Private
 */
router.get("/", protect, getWishlist);

/**
 * @route   GET /api/v1/wishlist/stats
 * @desc    Get wishlist statistics
 * @access  Private
 */
router.get("/stats", protect, getWishlistStats);

/**
 * @route   GET /api/v1/wishlist/price-drops
 * @desc    Get price drop items
 * @access  Private
 */
router.get("/price-drops", protect, getPriceDropItems);

/**
 * @route   POST /api/v1/wishlist
 * @desc    Add to wishlist
 * @access  Private
 */
router.post("/", protect, productIdValidation, validate, addToWishlist);

/**
 * @route   POST /api/v1/wishlist/toggle
 * @desc    Toggle wishlist item
 * @access  Private
 */
router.post("/toggle", protect, productIdValidation, validate, toggleWishlist);

/**
 * @route   POST /api/v1/wishlist/check
 * @desc    Bulk check wishlist
 * @access  Private
 */
router.post(
  "/check",
  protect,
  bulkCheckValidation,
  validate,
  bulkCheckWishlist,
);

/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product in wishlist
 * @access  Private
 */
router.get("/check/:productId", protect, checkWishlist);

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove from wishlist
 * @access  Private
 */
router.delete("/:productId", protect, removeFromWishlist);

/**
 * @route   PUT /api/v1/wishlist/price-drop
 * @desc    Set price drop notification
 * @access  Private
 */
router.put(
  "/price-drop",
  protect,
  notificationValidation,
  validate,
  setPriceDropNotification,
);

/**
 * @route   PUT /api/v1/wishlist/back-in-stock
 * @desc    Set back in stock notification
 * @access  Private
 */
router.put(
  "/back-in-stock",
  protect,
  notificationValidation,
  validate,
  setBackInStockNotification,
);

module.exports = router;
