/**
 * Cart Routes
 * Shopping cart endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, optionalAuth } = require("../middleware/auth");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
  mergeCart,
} = require("../controllers/cartController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const addToCartValidation = [
  body("productId").isMongoId().withMessage("Invalid product ID"),
  body("size").notEmpty().withMessage("Size is required"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be 1-99"),
];

const updateCartValidation = [
  body("productId").isMongoId().withMessage("Invalid product ID"),
  body("size").notEmpty().withMessage("Size is required"),
  body("quantity")
    .isInt({ min: 0, max: 99 })
    .withMessage("Quantity must be 0-99"),
];

const couponValidation = [
  body("code").notEmpty().withMessage("Coupon code is required"),
  body("code").isString().trim(),
];

const mergeCartValidation = [
  body("sessionId").notEmpty().withMessage("Session ID is required"),
];

// ==========================================
// CART ROUTES
// ==========================================

/**
 * @route   GET /api/v1/cart
 * @desc    Get user cart (supports guest carts)
 * @access  Public (with optional auth)
 */
router.get("/", optionalAuth, getCart);

/**
 * @route   GET /api/v1/cart/summary
 * @desc    Get cart summary for checkout
 * @access  Public (with optional auth)
 */
router.get("/summary", optionalAuth, getCartSummary);

/**
 * @route   POST /api/v1/cart/items
 * @desc    Add item to cart (supports guest carts)
 * @access  Public
 */
router.post("/items", optionalAuth, addToCartValidation, validate, addToCart);

/**
 * @route   PUT /api/v1/cart/items
 * @desc    Update cart item quantity (supports guest carts)
 * @access  Public
 */
router.put("/items", optionalAuth, updateCartValidation, validate, updateCartItem);

/**
 * @route   DELETE /api/v1/cart/items/:productId/:size
 * @desc    Remove item from cart (supports guest carts)
 * @access  Public
 */
router.delete("/items/:productId/:size", optionalAuth, removeFromCart);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear cart (supports guest carts)
 * @access  Public
 */
router.delete("/", optionalAuth, clearCart);

/**
 * @route   POST /api/v1/cart/coupon
 * @desc    Apply coupon to cart (supports guest carts)
 * @access  Public
 */
router.post("/coupon", optionalAuth, couponValidation, validate, applyCoupon);

/**
 * @route   DELETE /api/v1/cart/coupon
 * @desc    Remove coupon from cart (supports guest carts)
 * @access  Public
 */
router.delete("/coupon", optionalAuth, removeCoupon);

/**
 * @route   POST /api/v1/cart/merge
 * @desc    Merge guest cart with user cart (requires login)
 * @access  Private
 */
router.post("/merge", protect, mergeCartValidation, validate, mergeCart);

module.exports = router;