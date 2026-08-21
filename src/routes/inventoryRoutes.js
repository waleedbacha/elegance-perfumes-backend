/**
 * Inventory Routes
 * Inventory management endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");

const {
  getInventory,
  getAllInventory,
  updateInventory,
  addStock,
  deductStock,
  reserveStock,
  releaseReservedStock,
  getLowStock,
  getOutOfStock,
  getInventorySummary,
  getInventoryReport,
  getInventoryHistory,
  bulkUpdateInventory,
} = require("../controllers/inventoryController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const inventoryUpdateValidation = [
  body("quantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity must be 0 or greater"),
  body("lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Threshold must be 0 or greater"),
  body("locations")
    .optional()
    .isArray()
    .withMessage("Locations must be an array"),
  body("suppliers")
    .optional()
    .isArray()
    .withMessage("Suppliers must be an array"),
];

const stockActionValidation = [
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("reason").optional().isString().trim(),
  body("notes").optional().isString().trim(),
];

const reserveValidation = [
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const releaseValidation = [
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("reason").optional().isString().trim(),
];

const reportValidation = [
  query("startDate").isISO8601().withMessage("Invalid start date"),
  query("endDate").isISO8601().withMessage("Invalid end date"),
  query("startDate").custom((value, { req }) => {
    if (new Date(value) > new Date(req.query.endDate)) {
      throw new Error("Start date must be before end date");
    }
    return true;
  }),
];

const bulkUpdateValidation = [
  body("updates").isArray().withMessage("Updates must be an array"),
  body("updates.*.productId").isMongoId().withMessage("Invalid product ID"),
  body("updates.*.quantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Quantity must be 0 or greater"),
  body("updates.*.lowStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Threshold must be 0 or greater"),
];

// ==========================================
// ADMIN INVENTORY ROUTES
// ==========================================

/**
 * @route   GET /api/v1/inventory
 * @desc    Get all inventory (Admin)
 * @access  Private/Admin
 */
router.get("/", protect, adminOnly, getAllInventory);

/**
 * @route   GET /api/v1/inventory/summary
 * @desc    Get inventory summary (Admin)
 * @access  Private/Admin
 */
router.get("/summary", protect, adminOnly, getInventorySummary);

/**
 * @route   GET /api/v1/inventory/low-stock
 * @desc    Get low stock products (Admin)
 * @access  Private/Admin
 */
router.get("/low-stock", protect, adminOnly, getLowStock);

/**
 * @route   GET /api/v1/inventory/out-of-stock
 * @desc    Get out of stock products (Admin)
 * @access  Private/Admin
 */
router.get("/out-of-stock", protect, adminOnly, getOutOfStock);

/**
 * @route   GET /api/v1/inventory/report
 * @desc    Get inventory report (Admin)
 * @access  Private/Admin
 */
router.get(
  "/report",
  protect,
  adminOnly,
  reportValidation,
  validate,
  getInventoryReport,
);

/**
 * @route   GET /api/v1/inventory/:productId
 * @desc    Get inventory for product (Admin)
 * @access  Private/Admin
 */
router.get("/:productId", protect, adminOnly, getInventory);

/**
 * @route   GET /api/v1/inventory/:productId/history
 * @desc    Get inventory history (Admin)
 * @access  Private/Admin
 */
router.get("/:productId/history", protect, adminOnly, getInventoryHistory);

/**
 * @route   PUT /api/v1/inventory/:productId
 * @desc    Update inventory (Admin)
 * @access  Private/Admin
 */
router.put(
  "/:productId",
  protect,
  adminOnly,
  inventoryUpdateValidation,
  validate,
  updateInventory,
);

/**
 * @route   POST /api/v1/inventory/:productId/add-stock
 * @desc    Add stock (Admin)
 * @access  Private/Admin
 */
router.post(
  "/:productId/add-stock",
  protect,
  adminOnly,
  stockActionValidation,
  validate,
  addStock,
);

/**
 * @route   POST /api/v1/inventory/:productId/deduct-stock
 * @desc    Deduct stock (Admin)
 * @access  Private/Admin
 */
router.post(
  "/:productId/deduct-stock",
  protect,
  adminOnly,
  stockActionValidation,
  validate,
  deductStock,
);

/**
 * @route   POST /api/v1/inventory/:productId/reserve
 * @desc    Reserve stock (Admin)
 * @access  Private/Admin
 */
router.post(
  "/:productId/reserve",
  protect,
  adminOnly,
  reserveValidation,
  validate,
  reserveStock,
);

/**
 * @route   POST /api/v1/inventory/:productId/release
 * @desc    Release reserved stock (Admin)
 * @access  Private/Admin
 */
router.post(
  "/:productId/release",
  protect,
  adminOnly,
  releaseValidation,
  validate,
  releaseReservedStock,
);

/**
 * @route   POST /api/v1/inventory/bulk-update
 * @desc    Bulk update inventory (Admin)
 * @access  Private/Admin
 */
router.post(
  "/bulk-update",
  protect,
  adminOnly,
  bulkUpdateValidation,
  validate,
  bulkUpdateInventory,
);

module.exports = router;


