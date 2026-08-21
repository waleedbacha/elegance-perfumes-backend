/**
 * Auth Routes
 * Authentication endpoints
 */

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { validate } = require("../middleware/validation");
const rateLimiter = require("../middleware/rateLimiter");
const { protect } = require("../middleware/auth");

const {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateMe,
  deleteAccount,
  resendVerification,
  googleAuth, // ✅ ADD THIS
  facebookAuth, // ✅ ADD THIS
} = require("../controllers/authController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[\+]?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("passwordConfirm")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

const loginValidation = [
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),
  body("phone")
    .optional()
    .trim()
    .matches(/^[\+]?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),
  body("password").notEmpty().withMessage("Password is required"),
  body().custom((value) => {
    if (!value.email && !value.phone) {
      throw new Error("Email or phone is required");
    }
    return true;
  }),
];

const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email"),
];

const resetPasswordValidation = [
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("passwordConfirm")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("newPasswordConfirm")
    .notEmpty()
    .withMessage("Please confirm your new password")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("New passwords do not match"),
];

const updateProfileValidation = [
  body("name")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters"),
  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[\+]?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),
  body("gender")
    .optional({ nullable: true, checkFalsy: true })
    .isIn(["male", "female", "other", "prefer-not-to-say"])
    .withMessage("Invalid gender option"),
  body("dateOfBirth")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Allow empty, null, undefined
      if (!value || value === "" || value === null || value === undefined) {
        return true;
      }
      // Check if it's a valid date
      const date = new Date(value);
      return !isNaN(date.getTime());
    })
    .withMessage("Invalid date format"),
];

// ==========================================
// ROUTES
// ==========================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  "/register",
  rateLimiter.authLimiter,
  registerValidation,
  validate,
  register,
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  "/login",
  rateLimiter.authLimiter,
  loginValidation,
  validate,
  login,
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", protect, logout);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh-token", rateLimiter.authLimiter, refreshToken);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get("/verify-email/:token", verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  "/resend-verification",
  rateLimiter.authLimiter,
  forgotPasswordValidation,
  validate,
  resendVerification,
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset link
 * @access  Public
 */
router.post(
  "/forgot-password",
  rateLimiter.authLimiter,
  forgotPasswordValidation,
  validate,
  forgotPassword,
);

/**
 * @route   POST /api/v1/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  "/reset-password/:token",
  rateLimiter.authLimiter,
  resetPasswordValidation,
  validate,
  resetPassword,
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post(
  "/change-password",
  protect,
  changePasswordValidation,
  validate,
  changePassword,
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", protect, getMe);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put("/me", protect, updateProfileValidation, validate, updateMe);

/**
 * @route   DELETE /api/v1/auth/me
 * @desc    Delete/Deactivate account
 * @access  Private
 */
router.delete("/me", protect, deleteAccount);

// ==========================================
// OAUTH ROUTES
// ==========================================

/**
 * @route   POST /api/v1/auth/google
 * @desc    Google OAuth login/register
 * @access  Public
 */
router.post("/google", rateLimiter.authLimiter, googleAuth);

/**
 * @route   POST /api/v1/auth/facebook
 * @desc    Facebook OAuth login/register
 * @access  Public
 */
router.post("/facebook", rateLimiter.authLimiter, facebookAuth);

module.exports = router;
