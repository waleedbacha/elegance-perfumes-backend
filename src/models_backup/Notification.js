/**
 * Notification Model
 * User notifications and system alerts
 */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER REFERENCE
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // NOTIFICATION TYPE
    // ==========================================
    type: {
      type: String,
      enum: [
        "order",
        "payment",
        "shipping",
        "delivery",
        "review",
        "promotion",
        "newsletter",
        "system",
        "security",
        "loyalty",
        "wishlist",
        "stock",
        "admin",
      ],
      required: true,
    },
    subtype: {
      type: String,
      enum: [
        "order-confirmation",
        "order-update",
        "order-cancelled",
        "payment-success",
        "payment-failed",
        "shipping-confirmation",
        "out-for-delivery",
        "delivered",
        "review-request",
        "review-approved",
        "promotion",
        "coupon",
        "low-stock",
        "back-in-stock",
        "price-drop",
        "welcome",
        "birthday",
        "milestone",
        "security-alert",
        "password-change",
        "loyalty-points",
        "tier-upgrade",
        "system-update",
        "admin-message",
      ],
    },

    // ==========================================
    // CONTENT
    // ==========================================
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title must not exceed 200 characters"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "Message must not exceed 2000 characters"],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [100, "Summary must not exceed 100 characters"],
    },

    // ==========================================
    // DATA
    // ==========================================
    data: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
      orderNumber: String,
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      productName: String,
      couponCode: String,
      discountAmount: Number,
      points: Number,
      tier: String,
      amount: Number,
      status: String,
      url: String,
      image: String,
      metadata: mongoose.Schema.Types.Mixed,
    },

    // ==========================================
    // ACTION
    // ==========================================
    action: {
      label: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        trim: true,
      },
      method: {
        type: String,
        enum: ["GET", "POST", "PUT", "DELETE"],
        default: "GET",
      },
      params: mongoose.Schema.Types.Mixed,
    },

    // ==========================================
    // STATUS
    // ==========================================
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
    clicked: {
      type: Boolean,
      default: false,
    },
    clickedAt: Date,

    // ==========================================
    // DELIVERY CHANNELS
    // ==========================================
    channels: {
      email: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      sms: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      push: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      whatsapp: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
        error: String,
      },
      inApp: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
    },

    // ==========================================
    // PRIORITY
    // ==========================================
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // ==========================================
    // EXPIRY
    // ==========================================
    expiresAt: {
      type: Date,
    },
    archivedAt: Date,

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ==========================================
// INDEXES FOR PERFORMANCE
// ==========================================
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ delivered: 1 });

// Compound indexes
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });
notificationSchema.index({ read: 1, expiresAt: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
notificationSchema.virtual("isRead").get(function () {
  return this.read;
});

notificationSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

notificationSchema.virtual("isUrgent").get(function () {
  return this.priority === "urgent" || this.priority === "high";
});

notificationSchema.virtual("timeAgo").get(function () {
  const diff = Date.now() - this.createdAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  this.readAt = new Date();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Mark notification as delivered
 */
notificationSchema.methods.markAsDelivered = async function (
  channel = "inApp",
) {
  this.delivered = true;
  this.deliveredAt = new Date();
  this.channels[channel].sent = true;
  this.channels[channel].sentAt = new Date();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Mark notification as clicked
 */
notificationSchema.methods.markAsClicked = async function () {
  this.clicked = true;
  this.clickedAt = new Date();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Archive notification
 */
notificationSchema.methods.archive = async function () {
  this.archivedAt = new Date();
  this.updatedAt = new Date();
  await this.save();
  return this;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get user notifications with pagination
 */
notificationSchema.statics.getUserNotifications = async function (
  userId,
  options = {},
) {
  const {
    page = 1,
    limit = 20,
    read = null,
    type = null,
    priority = null,
    sort = { createdAt: -1 },
    includeArchived = false,
  } = options;

  const query = { user: userId };

  if (read !== null) query.read = read;
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (!includeArchived) {
    query.archivedAt = null;
  }

  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit),
    this.countDocuments(query),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get unread count for user
 */
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    user: userId,
    read: false,
    expiresAt: { $or: [{ $exists: false }, { $gte: new Date() }] },
    archivedAt: null,
  });
};

/**
 * Mark all as read for user
 */
notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    {
      user: userId,
      read: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return result;
};

/**
 * Delete expired notifications
 */
notificationSchema.statics.deleteExpired = async function () {
  const result = await this.deleteMany({
    expiresAt: { $lte: new Date() },
    read: true,
  });

  return result;
};

/**
 * Get notification statistics
 */
notificationSchema.statics.getStats = async function (userId = null) {
  const match = {};
  if (userId) match.user = userId;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        type: "$_id",
        count: 1,
        unread: 1,
        read: { $subtract: ["$count", "$unread"] },
      },
    },
  ]);

  return stats;
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Notification", notificationSchema);

