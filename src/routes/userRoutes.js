/**
 * User Routes
 * User management (Admin)
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
  getUserStats,
  bulkUserAction,
} = require("../controllers/userController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const updateUserValidation = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }),
  body("email").optional().trim().isEmail().normalizeEmail(),
  body("phone")
    .optional()
    .trim()
    .matches(/^[\+]?[0-9]{10,15}$/),
  body("role").optional().isIn(["customer", "admin", "manager", "delivery"]),
  body("status").optional().isIn(["active", "suspended", "deactivated"]),
  body("loyaltyTier").optional().isIn(["bronze", "silver", "gold", "platinum"]),
];

const addressValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("phone").notEmpty().withMessage("Phone is required"),
  body("street").notEmpty().withMessage("Street is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("zipCode").notEmpty().withMessage("ZIP code is required"),
  body("country").optional().trim(),
  body("isDefault").optional().isBoolean(),
  body("type").optional().isIn(["home", "work", "other"]),
];

const bulkUserActionValidation = [
  body("userIds").isArray().withMessage("User IDs must be an array"),
  body("userIds.*").isMongoId().withMessage("Invalid user ID"),
  body("action")
    .isIn(["activate", "deactivate", "suspend", "changeRole"])
    .withMessage("Invalid action"),
  body("value")
    .optional()
    .isIn(["customer", "admin", "manager", "delivery"])
    .withMessage("Invalid role"),
];

// ==========================================
// USER PROFILE ROUTES (Authenticated)
// ==========================================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get("/profile", protect, getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", protect, updateProfile);

/**
 * @route   GET /api/v1/users/addresses
 * @desc    Get user addresses
 * @access  Private
 */
router.get("/addresses", protect, getAddresses);

/**
 * @route   POST /api/v1/users/addresses
 * @desc    Add new address
 * @access  Private
 */
router.post("/addresses", protect, addressValidation, validate, addAddress);

/**
 * @route   PUT /api/v1/users/addresses/:addressId
 * @desc    Update address
 * @access  Private
 */
router.put(
  "/addresses/:addressId",
  protect,
  addressValidation,
  validate,
  updateAddress,
);

/**
 * @route   DELETE /api/v1/users/addresses/:addressId
 * @desc    Delete address
 * @access  Private
 */
router.delete("/addresses/:addressId", protect, deleteAddress);

// ==========================================
// ADMIN USER MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin)
 * @access  Private/Admin
 */
router.get("/", protect, adminOnly, getAllUsers);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics (Admin)
 * @access  Private/Admin
 */
router.get("/stats", protect, adminOnly, getUserStats);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get single user (Admin)
 * @access  Private/Admin
 */
router.get("/:id", protect, adminOnly, getUser);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user (Admin)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  updateUserValidation,
  validate,
  updateUser,
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete/Deactivate user (Admin)
 * @access  Private/Admin
 */
router.delete("/:id", protect, adminOnly, deleteUser);

/**
 * @route   POST /api/v1/users/bulk-action
 * @desc    Bulk user actions (Admin)
 * @access  Private/Admin
 */
router.post(
  "/bulk-action",
  protect,
  adminOnly,
  bulkUserActionValidation,
  validate,
  bulkUserAction,
);

module.exports = router;
