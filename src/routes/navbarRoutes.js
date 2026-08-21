/**
 * Navbar Routes
 * Navbar management endpoints
 */

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");

const {
  getNavbar,
  getAllNavbarItems,
  getNavbarItem,
  createNavbarItem,
  updateNavbarItem,
  deleteNavbarItem,
  reorderNavbarItems,
  seedNavbar,
  toggleVisibility,
} = require("../controllers/navbarController");

// ==========================================
// VALIDATION - ONLY REQUIRED FIELDS
// ==========================================

const createValidation = [
  body("label").notEmpty().withMessage("Label is required"),
  body("path").notEmpty().withMessage("Path is required"),
  // ✅ Don't validate parentId - let the controller handle it
];

const updateValidation = [
  body("label").optional(),
  body("path").optional(),
  // ✅ Don't validate parentId - let the controller handle it
];

const reorderValidation = [
  body("items").isArray().withMessage("Items array is required"),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.get("/", getNavbar);

// ==========================================
// ADMIN ROUTES
// ==========================================

router.get("/admin/all", protect, adminOnly, getAllNavbarItems);
router.get("/admin/:id", protect, adminOnly, getNavbarItem);

router.post(
  "/admin",
  protect,
  adminOnly,
  createValidation,
  validate,
  createNavbarItem,
);

router.put(
  "/admin/:id",
  protect,
  adminOnly,
  updateValidation,
  validate,
  updateNavbarItem,
);

router.delete("/admin/:id", protect, adminOnly, deleteNavbarItem);

router.post(
  "/admin/reorder",
  protect,
  adminOnly,
  reorderValidation,
  validate,
  reorderNavbarItems,
);

router.post("/admin/seed", protect, adminOnly, seedNavbar);

router.put(
  "/admin/:id/toggle-visibility",
  protect,
  adminOnly,
  toggleVisibility,
);

module.exports = router;
