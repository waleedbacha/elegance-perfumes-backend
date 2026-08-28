// backend/src/routes/popupRoutes.js

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const { upload, handleUploadError } = require("../middleware/upload");

const {
  getActivePopup,
  getAllPopups,
  getPopup,
  createPopup,
  updatePopup,
  deletePopup,
  togglePopupStatus,
  getPopupStats,
  recordPopupClick,
  recordPopupConversion,
} = require("../controllers/popupController");

// ============================================
// VALIDATION
// ============================================

const popupValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("triggerDelay")
    .optional()
    .isInt({ min: 1000, max: 30000 })
    .withMessage("Trigger delay must be between 1000 and 30000ms"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "scheduled"])
    .withMessage("Invalid status"),
];

// ============================================
// PUBLIC ROUTES
// ============================================

router.get("/active", getActivePopup);
router.post("/:id/click", recordPopupClick);
router.post("/:id/conversion", recordPopupConversion);

// ============================================
// ADMIN ROUTES
// ============================================

router.get("/", protect, adminOnly, getAllPopups);
router.get("/stats", protect, adminOnly, getPopupStats);
router.get("/:id", protect, adminOnly, getPopup);

router.post(
  "/",
  protect,
  adminOnly,
  upload.single("image"),
  handleUploadError,
  popupValidation,
  validate,
  createPopup,
);

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.single("image"),
  handleUploadError,
  popupValidation,
  validate,
  updatePopup,
);

router.delete("/:id", protect, adminOnly, deletePopup);
router.put("/:id/toggle", protect, adminOnly, togglePopupStatus);

module.exports = router;
