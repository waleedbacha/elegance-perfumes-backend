/**
 * Notification Controller
 * User notifications management
 */

const { AppError } = require("../middleware/errorHandler");
const Notification = require("../models/Notification");

/**
 * Get user notifications
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, read, type, priority } = req.query;

    const result = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      read: read !== undefined ? read === "true" : null,
      type,
      priority,
    });

    // Get unread count
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        ...result,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!notification) {
      throw new AppError(
        "Notification not found",
        404,
        "NOTIFICATION_NOT_FOUND",
      );
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      data: { notification },
      message: "Notification marked as read",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      data: { updated: result.modifiedCount },
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive notification
 */
exports.archiveNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!notification) {
      throw new AppError(
        "Notification not found",
        404,
        "NOTIFICATION_NOT_FOUND",
      );
    }

    await notification.archive();

    res.status(200).json({
      success: true,
      data: { notification },
      message: "Notification archived",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await Notification.deleteOne({
      _id: id,
      user: req.user.id,
    });

    if (result.deletedCount === 0) {
      throw new AppError(
        "Notification not found",
        404,
        "NOTIFICATION_NOT_FOUND",
      );
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN NOTIFICATION CONTROLLERS
// ==========================================

/**
 * Send notification to user (Admin)
 */
exports.sendNotification = async (req, res, next) => {
  try {
    const {
      userId,
      type,
      subtype,
      title,
      message,
      data,
      action,
      priority,
      expiresAt,
    } = req.body;

    if (!userId || !type || !title || !message) {
      throw new AppError(
        "User ID, type, title, and message are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const notification = new Notification({
      user: userId,
      type,
      subtype,
      title,
      message,
      data: data || {},
      action: action || null,
      priority: priority || "medium",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    await notification.save();

    // Send email if requested
    if (req.body.sendEmail) {
      // Implementation depends on email service
    }

    res.status(201).json({
      success: true,
      data: { notification },
      message: "Notification sent",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send bulk notification (Admin)
 */
exports.sendBulkNotification = async (req, res, next) => {
  try {
    const { userIds, type, subtitle, title, message, data, action, priority } =
      req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError("User IDs array is required", 400, "MISSING_USER_IDS");
    }

    const notifications = userIds.map((userId) => ({
      user: userId,
      type: type || "system",
      subtype,
      title,
      message,
      data: data || {},
      action: action || null,
      priority: priority || "medium",
    }));

    const result = await Notification.insertMany(notifications);

    res.status(201).json({
      success: true,
      data: {
        sent: result.length,
      },
      message: `Sent ${result.length} notifications`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all notifications (Admin)
 */
exports.getAllNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      read,
      search,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (read !== undefined) query.read = read === "true";
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate("user", "name email")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification stats (Admin)
 */
exports.getNotificationStats = async (req, res, next) => {
  try {
    const stats = await Notification.getStats();

    // Get 7-day activity
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const dailyStats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats,
        dailyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
