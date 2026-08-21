/**
 * Coupon Routes
 * Coupon management endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const {
  validateCoupon,
  createCoupon,
  getAllCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponAnalytics,
  bulkDeleteCoupons,
} = require("../controllers/couponController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const couponValidation = [
  body("code")
    .notEmpty()
    .withMessage("Coupon code is required")
    .isLength({ min: 4, max: 20 })
    .withMessage("Coupon code must be 4-20 characters")
    .matches(/^[A-Z0-9]+$/i)
    .withMessage("Coupon code must be alphanumeric"),
  body("name").notEmpty().withMessage("Coupon name is required"),
  body("discountType")
    .isIn(["percentage", "fixed"])
    .withMessage("Invalid discount type"),
  body("discountValue")
    .isNumeric()
    .withMessage("Discount value must be a number")
    .custom((value, { req }) => {
      if (req.body.discountType === "percentage" && value > 100) {
        throw new Error("Percentage discount cannot exceed 100%");
      }
      return true;
    }),
  body("validFrom").isISO8601().withMessage("Invalid start date"),
  body("validUntil")
    .isISO8601()
    .withMessage("Invalid end date")
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1"),
  body("perUserLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Per user limit must be at least 1"),
  body("minOrderAmount")
    .optional()
    .isNumeric()
    .withMessage("Minimum order amount must be a number"),
];

const couponUpdateValidation = [
  body("name").optional().notEmpty().withMessage("Coupon name cannot be empty"),
  body("discountValue")
    .optional()
    .isNumeric()
    .withMessage("Discount value must be a number"),
  body("validFrom").optional().isISO8601().withMessage("Invalid start date"),
  body("validUntil").optional().isISO8601().withMessage("Invalid end date"),
  body("usageLimit")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Usage limit must be at least 1"),
];

const bulkDeleteValidation = [
  body("couponIds").isArray().withMessage("Coupon IDs must be an array"),
  body("couponIds.*").isMongoId().withMessage("Invalid coupon ID"),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   GET /api/v1/coupons/validate/:code
 * @desc    Validate coupon code
 * @access  Public
 */
router.get("/validate/:code", rateLimiter.authLimiter, validateCoupon);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @route   POST /api/v1/coupons
 * @desc    Create coupon (Admin)
 * @access  Private/Admin
 */
router.post("/", protect, adminOnly, couponValidation, validate, createCoupon);

/**
 * @route   GET /api/v1/coupons
 * @desc    Get all coupons (Admin)
 * @access  Private/Admin
 */
router.get("/", protect, adminOnly, getAllCoupons);

/**
 * @route   GET /api/v1/coupons/analytics
 * @desc    Get coupon analytics (Admin)
 * @access  Private/Admin
 */
router.get("/analytics", protect, adminOnly, getCouponAnalytics);

/**
 * @route   GET /api/v1/coupons/:id
 * @desc    Get single coupon (Admin)
 * @access  Private/Admin
 */
router.get("/:id", protect, adminOnly, getCoupon);

/**
 * @route   PUT /api/v1/coupons/:id
 * @desc    Update coupon (Admin)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  couponUpdateValidation,
  validate,
  updateCoupon,
);

/**
 * @route   DELETE /api/v1/coupons/:id
 * @desc    Delete coupon (Admin)
 * @access  Private/Admin
 */
router.delete("/:id", protect, adminOnly, deleteCoupon);

/**
 * @route   PUT /api/v1/coupons/:id/toggle
 * @desc    Toggle coupon status (Admin)
 * @access  Private/Admin
 */
router.put("/:id/toggle", protect, adminOnly, toggleCouponStatus);

/**
 * @route   POST /api/v1/coupons/bulk-delete
 * @desc    Bulk delete coupons (Admin)
 * @access  Private/Admin
 */
router.post(
  "/bulk-delete",
  protect,
  adminOnly,
  bulkDeleteValidation,
  validate,
  bulkDeleteCoupons,
);

module.exports = router;
