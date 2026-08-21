/**
 * Payment Routes
 * Payment processing endpoints
 */

const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const {
  initiatePayment,
  verifyPayment,
  paymentWebhook,
  processRefund,
  getPaymentMethods,
  getPaymentHistory,
} = require("../controllers/paymentController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const initiatePaymentValidation = [
  body("orderId").isMongoId().withMessage("Invalid order ID"),
  body("paymentMethod")
    .isIn(["cod", "bank-transfer", "jazzcash", "easypaisa"])
    .withMessage("Invalid payment method"),
];

const verifyPaymentValidation = [
  body("orderId").isMongoId().withMessage("Invalid order ID"),
  body("transactionId").notEmpty().withMessage("Transaction ID is required"),
  body("paymentMethod")
    .optional()
    .isIn(["cod", "bank-transfer", "jazzcash", "easypaisa"])
    .withMessage("Invalid payment method"),
];

const refundValidation = [
  body("orderId").isMongoId().withMessage("Invalid order ID"),
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("amount")
    .custom((value) => value > 0)
    .withMessage("Amount must be greater than 0"),
  body("reason").optional().isString().trim(),
];

// ==========================================
// USER PAYMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/payment/methods
 * @desc    Get available payment methods
 * @access  Public
 */
router.get("/methods", getPaymentMethods);

/**
 * @route   GET /api/v1/payment/history
 * @desc    Get user payment history
 * @access  Private
 */
router.get("/history", protect, getPaymentHistory);

/**
 * @route   POST /api/v1/payment/initiate
 * @desc    Initiate payment
 * @access  Private
 */
router.post(
  "/initiate",
  protect,
  rateLimiter.paymentLimiter,
  initiatePaymentValidation,
  validate,
  initiatePayment,
);

/**
 * @route   POST /api/v1/payment/verify
 * @desc    Verify payment
 * @access  Private
 */
router.post(
  "/verify",
  protect,
  verifyPaymentValidation,
  validate,
  verifyPayment,
);

// ==========================================
// PUBLIC WEBHOOK ROUTE
// ==========================================

/**
 * @route   POST /api/v1/payment/webhook
 * @desc    Payment gateway webhook
 * @access  Public (with signature verification)
 */
router.post("/webhook", paymentWebhook);

// ==========================================
// ADMIN PAYMENT ROUTES
// ==========================================

/**
 * @route   POST /api/v1/payment/refund
 * @desc    Process refund (Admin)
 * @access  Private/Admin
 */
router.post(
  "/refund",
  protect,
  adminOnly,
  refundValidation,
  validate,
  processRefund,
);

module.exports = router;
