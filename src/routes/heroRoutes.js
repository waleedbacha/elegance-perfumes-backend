/**
 * Hero Routes
 * Hero section management
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const {
  getHero,
  getAllHeroes,
  getHeroById,
  createHero,
  updateHero,
  deleteHero,
  seedHero,
  toggleHeroStatus,
} = require("../controllers/heroController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const createHeroValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
  body("buttonText").optional().isString(),
  body("buttonLink").optional().isString(),
  body("isActive").optional().isBoolean(),
  body("isDefault").optional().isBoolean(),
  body("order").optional().isInt({ min: 0 }),
];

const updateHeroValidation = [
  body("title").optional().isString(),
  body("description").optional().isString(),
  body("buttonText").optional().isString(),
  body("buttonLink").optional().isString(),
  body("isActive").optional().isBoolean(),
  body("isDefault").optional().isBoolean(),
  body("order").optional().isInt({ min: 0 }),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * @route   GET /api/v1/hero
 * @desc    Get active hero
 * @access  Public
 */
router.get("/", getHero);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @route   GET /api/v1/hero/admin/all
 * @desc    Get all heroes (Admin)
 * @access  Private/Admin
 */
router.get("/admin/all", protect, adminOnly, getAllHeroes);

/**
 * @route   GET /api/v1/hero/admin/:id
 * @desc    Get single hero (Admin)
 * @access  Private/Admin
 */
router.get("/admin/:id", protect, adminOnly, getHeroById);

/**
 * @route   POST /api/v1/hero
 * @desc    Create hero (Admin)
 * @access  Private/Admin
 */
router.post(
  "/",
  protect,
  adminOnly,
  upload.single("backgroundImage"),
  createHeroValidation,
  validate,
  createHero,
);

/**
 * @route   PUT /api/v1/hero/admin/:id
 * @desc    Update hero (Admin)
 * @access  Private/Admin
 */
router.put(
  "/admin/:id",
  protect,
  adminOnly,
  upload.single("backgroundImage"),
  updateHeroValidation,
  validate,
  updateHero,
);

/**
 * @route   DELETE /api/v1/hero/admin/:id
 * @desc    Delete hero (Admin)
 * @access  Private/Admin
 */
router.delete("/admin/:id", protect, adminOnly, deleteHero);

/**
 * @route   POST /api/v1/hero/admin/seed
 * @desc    Seed default hero (Admin)
 * @access  Private/Admin
 */
router.post("/admin/seed", protect, adminOnly, seedHero);

/**
 * @route   PUT /api/v1/hero/admin/:id/toggle
 * @desc    Toggle hero status (Admin)
 * @access  Private/Admin
 */
router.put("/admin/:id/toggle", protect, adminOnly, toggleHeroStatus);

module.exports = router;
