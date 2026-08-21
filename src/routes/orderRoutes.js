/**
 * Order Routes
 * Order management endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const {
  createOrder,
  getUserOrders,
  getOrder,
  cancelOrder,
  trackOrder,
  getAllOrders,
  getOrderAdmin,
  updateOrderStatus,
  updateTracking,
  addTrackingUpdate,
  getOrderStats,
  generateInvoice,
  confirmPayment,
  markPaymentFailed,
} = require("../controllers/orderController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const orderValidation = [
  // Items validation
  body("items")
    .isArray()
    .withMessage("Items must be an array")
    .notEmpty()
    .withMessage("Items cannot be empty"),

  body("items.*.productId")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("items.*.product")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("Invalid product ID"),

  body("items.*.size").notEmpty().withMessage("Size is required"),

  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),

  // ✅ Shipping Address - ALL REQUIRED
  body("shippingAddress")
    .isObject()
    .withMessage("Shipping address is required"),

  body("shippingAddress.name")
    .notEmpty()
    .withMessage("Shipping name is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters"),

  body("shippingAddress.phone")
    .notEmpty()
    .withMessage("Shipping phone is required")
    .trim()
    .matches(/^[\+]?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),

  body("shippingAddress.street")
    .notEmpty()
    .withMessage("Shipping street is required")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Street address is required"),

  body("shippingAddress.area")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Area must be less than 100 characters"),

  body("shippingAddress.city")
    .notEmpty()
    .withMessage("Shipping city is required")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City is required"),

  body("shippingAddress.state")
    .notEmpty()
    .withMessage("Shipping state is required")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("State is required"),

  body("shippingAddress.zipCode")
    .notEmpty()
    .withMessage("Shipping zip code is required")
    .trim()
    .matches(/^\d{5}$/)
    .withMessage("Please enter a valid 5-digit zip code"),

  body("shippingAddress.country")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country is required"),

  body("shippingAddress.landmark")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Landmark must be less than 200 characters"),

  body("shippingAddress.deliveryInstructions")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Delivery instructions must be less than 500 characters"),

  // ✅ Billing Address - Optional
  body("billingAddress")
    .optional({ nullable: true, checkFalsy: true })
    .isObject()
    .withMessage("Billing address must be an object"),

  body("billingAddress.sameAsShipping")
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage("sameAsShipping must be a boolean"),

  body("billingAddress.name")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters"),

  body("billingAddress.phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[\+]?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),

  body("billingAddress.street")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Street address is required"),

  body("billingAddress.city")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City is required"),

  body("billingAddress.state")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("State is required"),

  body("billingAddress.zipCode")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\d{5}$/)
    .withMessage("Please enter a valid 5-digit zip code"),

  body("billingAddress.country")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country is required"),

  // Payment - Required
  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["cod", "card", "bank-transfer", "easypaisa", "jazzcash"])
    .withMessage("Invalid payment method"),

  // Coupon - Optional
  body("couponCode")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Invalid coupon code"),

  // Notes - Optional
  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must be less than 500 characters"),

  // Gift options - Optional
  body("giftMessage")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Gift message must be less than 200 characters"),

  body("isGift")
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage("isGift must be a boolean"),

  body("giftWrap")
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage("giftWrap must be a boolean"),
];

const statusUpdateValidation = [
  body("status")
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "out-for-delivery",
      "delivered",
      "cancelled",
    ])
    .withMessage("Invalid status"),
  body("note").optional().isString().trim(),
];

const trackingUpdateValidation = [
  body("trackingNumber").notEmpty().withMessage("Tracking number is required"),
  body("provider").notEmpty().withMessage("Tracking provider is required"),
  body("url").optional().isURL().withMessage("Invalid URL"),
];

const trackingStatusValidation = [
  body("status").notEmpty().withMessage("Status is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("location").optional().isString().trim(),
];

// ==========================================
// USER ORDER ROUTES
// ==========================================

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order
 * @access  Private
 */
router.post(
  "/",
  protect,
  rateLimiter.orderLimiter,
  orderValidation,
  validate,
  createOrder,
);

/**
 * @route   GET /api/v1/orders
 * @desc    Get user orders
 * @access  Private
 */
router.get("/", protect, getUserOrders);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get single order
 * @access  Private
 */
router.get("/:id", protect, getOrder);

/**
 * @route   GET /api/v1/orders/:id/track
 * @desc    Track order
 * @access  Private
 */
router.get("/:id/track", protect, trackOrder);

/**
 * @route   PUT /api/v1/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.put("/:id/cancel", protect, cancelOrder);

// ==========================================
// ADMIN ORDER ROUTES
// ==========================================

/**
 * @route   GET /api/v1/orders/admin/all
 * @desc    Get all orders (Admin)
 * @access  Private/Admin
 */
router.get("/admin/all", protect, adminOnly, getAllOrders);

/**
 * @route   GET /api/v1/orders/admin/stats
 * @desc    Get order statistics (Admin)
 * @access  Private/Admin
 */
router.get("/admin/stats", protect, adminOnly, getOrderStats);

/**
 * @route   GET /api/v1/orders/admin/:id
 * @desc    Get single order (Admin)
 * @access  Private/Admin
 */
router.get("/admin/:id", protect, adminOnly, getOrderAdmin);

/**
 * @route   PUT /api/v1/orders/admin/:id/status
 * @desc    Update order status (Admin)
 * @access  Private/Admin
 */
router.put(
  "/admin/:id/status",
  protect,
  adminOnly,
  statusUpdateValidation,
  validate,
  updateOrderStatus,
);

/**
 * @route   PUT /api/v1/orders/admin/:id/tracking
 * @desc    Update tracking information (Admin)
 * @access  Private/Admin
 */
router.put(
  "/admin/:id/tracking",
  protect,
  adminOnly,
  trackingUpdateValidation,
  validate,
  updateTracking,
);

/**
 * @route   POST /api/v1/orders/admin/:id/tracking-update
 * @desc    Add tracking update (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/:id/tracking-update",
  protect,
  adminOnly,
  trackingStatusValidation,
  validate,
  addTrackingUpdate,
);

/**
 * @route   POST /api/v1/orders/admin/:id/confirm-payment
 * @desc    Confirm payment manually (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/:id/confirm-payment",
  protect,
  adminOnly,
  [
    body("amount")
      .optional()
      .isNumeric()
      .withMessage("Amount must be a number"),
    body("note").optional().isString().trim(),
    body("paymentMethod")
      .optional()
      .isIn(["cod", "bank-transfer", "jazzcash", "easypaisa"])
      .withMessage("Invalid payment method"),
  ],
  validate,
  confirmPayment,
);

/**
 * @route   POST /api/v1/orders/admin/:id/mark-payment-failed
 * @desc    Mark payment as failed (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/:id/mark-payment-failed",
  protect,
  adminOnly,
  [body("reason").optional().isString().trim()],
  validate,
  markPaymentFailed,
);

/**
 * @route   POST /api/v1/orders/admin/:id/invoice
 * @desc    Generate invoice (Admin)
 * @access  Private/Admin
 */
router.post("/admin/:id/invoice", protect, adminOnly, generateInvoice);

module.exports = router;
