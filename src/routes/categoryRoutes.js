/**
 * Category Routes
 * Category management endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const {
  getCategories,
  getCategoryByName,
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  seedCategories,
} = require("../controllers/categoryController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const createCategoryValidation = [
  body("name")
    .notEmpty()
    .withMessage("Category name is required")
    .isIn(["men", "women", "unisex"])
    .withMessage("Category must be men, women, or unisex"),
  body("displayName")
    .notEmpty()
    .withMessage("Display name is required")
    .isLength({ min: 2, max: 20 })
    .withMessage("Display name must be 2-20 characters"),
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 5, max: 100 })
    .withMessage("Description must be 5-100 characters"),
  body("gradient")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Gradient must be a string"),
  body("order")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Order must be a positive number"),
];

const updateCategoryValidation = [
  body("displayName")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2, max: 20 })
    .withMessage("Display name must be 2-20 characters"),
  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 5, max: 100 })
    .withMessage("Description must be 5-100 characters"),
  body("gradient")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Gradient must be a string"),
  body("order")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 0 })
    .withMessage("Order must be a positive number"),
  body("isActive")
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

const reorderValidation = [
  body("categories").isArray().withMessage("Categories must be an array"),
  body("categories.*.id").isMongoId().withMessage("Invalid category ID"),
  body("categories.*.order")
    .isInt({ min: 0 })
    .withMessage("Order must be a positive number"),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   GET /api/v1/categories
 * @desc    Get all active categories
 * @access  Public
 */
router.get("/", getCategories);

/**
 * @route   GET /api/v1/categories/name/:name
 * @desc    Get category by name
 * @access  Public
 */
router.get("/name/:name", getCategoryByName);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @route   GET /api/v1/categories/admin/all
 * @desc    Get all categories (Admin)
 * @access  Private/Admin
 */
router.get("/admin/all", protect, adminOnly, getAllCategories);

/**
 * @route   GET /api/v1/categories/admin/:id
 * @desc    Get single category (Admin)
 * @access  Private/Admin
 */
router.get("/admin/:id", protect, adminOnly, getCategory);

/**
 * @route   POST /api/v1/categories
 * @desc    Create category (Admin)
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  createCategoryValidation,
  validate,
  createCategory,
);

/**
 * @route   PUT /api/v1/categories/admin/:id
 * @desc    Update category (Admin)
 * @access  Private/Admin
 */
router.put(
  "/admin/:id",
  protect,
  adminOnly,
  upload.single("image"),
  updateCategoryValidation,
  validate,
  updateCategory,
);

/**
 * @route   DELETE /api/v1/categories/admin/:id
 * @desc    Delete category (Admin)
 * @access  Private/Admin
 */
router.delete("/admin/:id", protect, adminOnly, deleteCategory);

/**
 * @route   POST /api/v1/categories/admin/reorder
 * @desc    Reorder categories (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/reorder",
  protect,
  adminOnly,
  reorderValidation,
  validate,
  reorderCategories,
);

/**
 * @route   POST /api/v1/categories/admin/seed
 * @desc    Seed default categories (Admin)
 * @access  Private/Admin
 */
router.post("/admin/seed", protect, adminOnly, seedCategories);

module.exports = router;
