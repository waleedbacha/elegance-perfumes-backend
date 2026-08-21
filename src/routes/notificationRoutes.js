/**
 * Notification Routes
 * User notification endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  archiveNotification,
  deleteNotification,
  sendNotification,
  sendBulkNotification,
  getAllNotifications,
  getNotificationStats,
} = require("../controllers/notificationController");

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const notificationValidation = [
  body("userId").isMongoId().withMessage("Invalid user ID"),
  body("type").notEmpty().withMessage("Notification type is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("message").notEmpty().withMessage("Message is required"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
];

const bulkNotificationValidation = [
  body("userIds").isArray().withMessage("User IDs must be an array"),
  body("userIds.*").isMongoId().withMessage("Invalid user ID"),
  body("title").notEmpty().withMessage("Title is required"),
  body("message").notEmpty().withMessage("Message is required"),
  body("type")
    .optional()
    .notEmpty()
    .withMessage("Notification type is required"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Invalid priority"),
];

// ==========================================
// USER NOTIFICATION ROUTES
// ==========================================

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get("/", protect, getNotifications);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get("/unread-count", protect, getUnreadCount);

/**
 * @route   PUT /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put("/:id/read", protect, markAsRead);

/**
 * @route   PUT /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/read-all", protect, markAllAsRead);

/**
 * @route   PUT /api/v1/notifications/:id/archive
 * @desc    Archive notification
 * @access  Private
 */
router.put("/:id/archive", protect, archiveNotification);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete("/:id", protect, deleteNotification);

// ==========================================
// ADMIN NOTIFICATION ROUTES
// ==========================================

/**
 * @route   POST /api/v1/notifications/admin/send
 * @desc    Send notification to user (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/send",
  protect,
  adminOnly,
  notificationValidation,
  validate,
  sendNotification,
);

/**
 * @route   POST /api/v1/notifications/admin/bulk-send
 * @desc    Send bulk notifications (Admin)
 * @access  Private/Admin
 */
router.post(
  "/admin/bulk-send",
  protect,
  adminOnly,
  bulkNotificationValidation,
  validate,
  sendBulkNotification,
);

/**
 * @route   GET /api/v1/notifications/admin/all
 * @desc    Get all notifications (Admin)
 * @access  Private/Admin
 */
router.get("/admin/all", protect, adminOnly, getAllNotifications);

/**
 * @route   GET /api/v1/notifications/admin/stats
 * @desc    Get notification stats (Admin)
 * @access  Private/Admin
 */
router.get("/admin/stats", protect, adminOnly, getNotificationStats);

module.exports = router;


