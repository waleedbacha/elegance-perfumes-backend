/**
 * Review Routes
 * Product review endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const {
  createReview,
  getProductReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  markHelpful,
  markNotHelpful,
  getAllReviews,
  getReviewDetails,
  approveReview,
  rejectReview,
  adminRespond,
  deleteReviewAdmin,
  getReviewAnalytics,
} = require("../controllers/reviewController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const reviewValidation = [
  body("productId").isMongoId().withMessage("Invalid product ID"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
  body("comment").notEmpty().withMessage("Review comment is required"),
  body("title").optional().isString().trim().isLength({ max: 100 }),
  body("pros").optional().isArray().withMessage("Pros must be an array"),
  body("cons").optional().isArray().withMessage("Cons must be an array"),
];

const reviewUpdateValidation = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be 1-5"),
  body("comment")
    .optional()
    .notEmpty()
    .withMessage("Review comment cannot be empty"),
  body("title").optional().isString().trim().isLength({ max: 100 }),
  body("pros").optional().isArray().withMessage("Pros must be an array"),
  body("cons").optional().isArray().withMessage("Cons must be an array"),
];

const adminResponseValidation = [
  body("response").notEmpty().withMessage("Response is required"),
];

// ==========================================
// USER REVIEW ROUTES
// ==========================================

/**
 * @route   POST /api/v1/reviews
 * @desc    Create review with images
 * @access  Private
 */
router.post(
  "/",
  protect,
  upload.array("images", 5), // ✅ Allow up to 5 images
  reviewValidation,
  validate,
  createReview,
);

/**
 * @route   GET /api/v1/reviews/me
 * @desc    Get user reviews
 * @access  Private
 */
router.get("/me", protect, getUserReviews);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update review
 * @access  Private
 */
router.put("/:id", protect, reviewUpdateValidation, validate, updateReview);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete review
 * @access  Private
 */
router.delete("/:id", protect, deleteReview);

/**
 * @route   POST /api/v1/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.post("/:id/helpful", protect, markHelpful);

/**
 * @route   POST /api/v1/reviews/:id/not-helpful
 * @desc    Mark review as not helpful
 * @access  Private
 */
router.post("/:id/not-helpful", protect, markNotHelpful);

/**
 * @route   GET /api/v1/reviews/product/:productId
 * @desc    Get product reviews
 * @access  Public
 */
router.get("/product/:productId", getProductReviews);

// ==========================================
// ADMIN REVIEW ROUTES
// ==========================================

/**
 * @route   GET /api/v1/reviews/admin/all
 * @desc    Get all reviews (Admin)
 * @access  Private/Admin
 */
router.get("/admin/all", protect, adminOnly, getAllReviews);

/**
 * @route   GET /api/v1/reviews/admin/analytics
 * @desc    Get review analytics (Admin)
 * @access  Private/Admin
 */
router.get("/admin/analytics", protect, adminOnly, getReviewAnalytics);

/**
 * @route   GET /api/v1/reviews/admin/:id
 * @desc    Get review details (Admin)
 * @access  Private/Admin
 */
router.get("/admin/:id", protect, adminOnly, getReviewDetails);

/**
 * @route   PUT /api/v1/reviews/admin/:id/approve
 * @desc    Approve review (Admin)
 * @access  Private/Admin
 */
router.put("/admin/:id/approve", protect, adminOnly, approveReview);

/**
 * @route   PUT /api/v1/reviews/admin/:id/reject
 * @desc    Reject review (Admin)
 * @access  Private/Admin
 */
router.put("/admin/:id/reject", protect, adminOnly, rejectReview);

/**
 * @route   POST /api/v1/reviews/admin/:id/respond
 * @desc    Admin response to review (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/:id/respond",
  protect,
  adminOnly,
  adminResponseValidation,
  validate,
  adminRespond,
);

/**
 * @route   DELETE /api/v1/reviews/admin/:id
 * @desc    Delete review (Admin)
 * @access  Private/Admin
 */
router.delete("/admin/:id", protect, adminOnly, deleteReviewAdmin);

module.exports = router;
