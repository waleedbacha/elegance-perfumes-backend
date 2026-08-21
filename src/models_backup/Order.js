/**
 * Order Model
 * Complete order schema with tracking
 */

const mongoose = require("mongoose");
const {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SHIPPING_METHODS,
} = require("../config/constants");

const orderSchema = new mongoose.Schema(
  {
    // ==========================================
    // ORDER IDENTIFIER
    // ==========================================
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // ==========================================
    // USER REFERENCE
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // CUSTOMER SNAPSHOT
    // ==========================================
    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      notes: String,
    },

    // ==========================================
    // SHIPPING ADDRESS
    // ==========================================
    shippingAddress: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      street: {
        type: String,
        required: true,
        trim: true,
      },
      area: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        default: "Pakistan",
        trim: true,
      },
      landmark: String,
      deliveryInstructions: String,
    },

    // ==========================================
    // BILLING ADDRESS
    // ==========================================
    billingAddress: {
      sameAsShipping: {
        type: Boolean,
        default: true,
      },
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // ==========================================
    // ORDER ITEMS
    // ==========================================
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        brand: {
          type: String,
          required: true,
        },
        size: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        discount: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          required: true,
          min: 0,
        },
        image: String,
        notes: String,
      },
    ],

    // ==========================================
    // PRICING SUMMARY
    // ==========================================
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    coupon: {
      code: String,
      discount: {
        type: Number,
        default: 0,
      },
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // ==========================================
    // PAYMENT
    // ==========================================
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paymentDetails: {
      transactionId: String,
      paidAt: Date,
      refundedAt: Date,
      gateway: String,
      gatewayResponse: mongoose.Schema.Types.Mixed,
      bankTransferReference: String,
      paymentScreenshot: {
        url: String,
        publicId: String,
      },
    },

    // ==========================================
    // ORDER STATUS
    // ==========================================
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(ORDER_STATUS),
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    // ==========================================
    // SHIPPING
    // ==========================================
    shippingMethod: {
      type: String,
      enum: Object.values(SHIPPING_METHODS),
      default: SHIPPING_METHODS.STANDARD,
    },
    tracking: {
      number: String,
      provider: String,
      url: String,
      estimatedDelivery: Date,
      deliveredAt: Date,
      status: {
        type: String,
        enum: ["pending", "processing", "in-transit", "delivered", "failed"],
        default: "pending",
      },
      history: [
        {
          status: String,
          location: String,
          timestamp: {
            type: Date,
            default: Date.now,
          },
          description: String,
        },
      ],
    },
    expectedDelivery: Date,
    deliveredAt: Date,

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    notifications: {
      orderConfirmation: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
      paymentConfirmation: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
      shippingConfirmation: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
      deliveryConfirmation: {
        sent: { type: Boolean, default: false },
        sentAt: Date,
      },
    },

    // ==========================================
    // ADDITIONAL
    // ==========================================
    specialInstructions: String,
    giftMessage: String,
    isGift: {
      type: Boolean,
      default: false,
    },
    giftWrap: {
      type: Boolean,
      default: false,
    },
    invoiceUrl: String,
    adminNotes: String,

    // ==========================================
    // ANALYTICS
    // ==========================================
    source: {
      type: String,
      enum: [
        "website",
        "whatsapp",
        "admin",
        "mobile-app",
        "instagram",
        "facebook",
      ],
      default: "website",
    },
    ipAddress: String,
    userAgent: String,
    referrer: String,
    couponCode: String,

    // ==========================================
    // CANCELLATION
    // ==========================================
    cancelledAt: Date,
    cancellationReason: String,
    cancellationNote: String,

    // ==========================================
    // RETURN
    // ==========================================
    returnedAt: Date,
    returnReason: String,
    returnStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
    },
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
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
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "tracking.number": 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "shippingAddress.city": 1 });
orderSchema.index({ source: 1 });

// Compound indexes for common queries
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ createdAt: -1, status: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
orderSchema.virtual("isPaid").get(function () {
  return this.paymentStatus === PAYMENT_STATUS.PAID;
});

orderSchema.virtual("isDelivered").get(function () {
  return this.status === ORDER_STATUS.DELIVERED;
});

orderSchema.virtual("isCancelled").get(function () {
  return this.status === ORDER_STATUS.CANCELLED;
});

orderSchema.virtual("canCancel").get(function () {
  return (
    this.status === ORDER_STATUS.PENDING ||
    this.status === ORDER_STATUS.CONFIRMED ||
    this.status === ORDER_STATUS.PROCESSING
  );
});

orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
orderSchema.pre("save", function (next) {
  // Generate order number if not provided
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }

  // Add initial status history
  if (this.isNew && !this.statusHistory.length) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      note: "Order created",
    });
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Update order status with history tracking
 */
orderSchema.methods.updateStatus = async function (
  newStatus,
  note = "",
  userId = null,
) {
  if (!Object.values(ORDER_STATUS).includes(newStatus)) {
    throw new Error("Invalid order status");
  }

  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy: userId,
  });

  // Update specific timestamps
  if (newStatus === ORDER_STATUS.DELIVERED) {
    this.deliveredAt = new Date();
  }

  if (newStatus === ORDER_STATUS.CANCELLED) {
    this.cancelledAt = new Date();
  }

  await this.save();
  return this;
};

/**
 * Update payment status
 */
orderSchema.methods.updatePayment = async function (
  status,
  transactionId = null,
) {
  if (!Object.values(PAYMENT_STATUS).includes(status)) {
    throw new Error("Invalid payment status");
  }

  this.paymentStatus = status;

  if (status === PAYMENT_STATUS.PAID) {
    this.paymentDetails.paidAt = new Date();
  }

  if (status === PAYMENT_STATUS.REFUNDED) {
    this.paymentDetails.refundedAt = new Date();
  }

  if (transactionId) {
    this.paymentDetails.transactionId = transactionId;
  }

  await this.save();
  return this;
};

/**
 * Update tracking information
 */
orderSchema.methods.updateTracking = async function (
  trackingNumber,
  provider,
  url = "",
) {
  this.tracking.number = trackingNumber;
  this.tracking.provider = provider;
  this.tracking.url =
    url || `https://track.${provider.toLowerCase()}.com/${trackingNumber}`;
  this.tracking.status = "processing";

  // Add to tracking history
  this.tracking.history.push({
    status: "processing",
    description: `Order shipped via ${provider}`,
    timestamp: new Date(),
  });

  await this.save();
  return this;
};

/**
 * Add tracking status update
 */
orderSchema.methods.addTrackingUpdate = async function (
  status,
  location,
  description,
) {
  this.tracking.history.push({
    status,
    location,
    description,
    timestamp: new Date(),
  });

  this.tracking.status = status;

  if (status === "delivered") {
    this.tracking.deliveredAt = new Date();
    this.status = ORDER_STATUS.DELIVERED;
    this.deliveredAt = new Date();
  }

  await this.save();
  return this;
};

/**
 * Cancel order
 */
orderSchema.methods.cancelOrder = async function (reason, note = "") {
  if (!this.canCancel) {
    throw new Error("Order cannot be cancelled at current status");
  }

  this.status = ORDER_STATUS.CANCELLED;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.cancellationNote = note;

  this.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    timestamp: new Date(),
    note: `Cancelled: ${reason}`,
  });

  await this.save();
  return this;
};

/**
 * Check if order can be returned
 */
orderSchema.methods.canReturn = function () {
  if (this.status !== ORDER_STATUS.DELIVERED) return false;
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(this.deliveredAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysSinceDelivery <= 7; // 7-day return policy
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Generate unique order number
 */
orderSchema.statics.generateOrderNumber = async function () {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const orderNumber = `ORD-${timestamp}-${random}`;

  // Check if exists
  const exists = await this.findOne({ orderNumber });
  if (exists) {
    // Recursive call with new random
    return this.generateOrderNumber();
  }

  return orderNumber;
};

/**
 * Get orders by user with pagination
 */
orderSchema.statics.getUserOrders = async function (userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    status = null,
    sort = { createdAt: -1 },
  } = options;

  const query = { user: userId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit),
    this.countDocuments(query),
  ]);

  return {
    orders,
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
 * Get order statistics
 */
orderSchema.statics.getOrderStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$total" },
        averageOrderValue: { $avg: "$total" },
        totalItems: { $sum: { $sum: "$items.quantity" } },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ["$status", ORDER_STATUS.PENDING] }, 1, 0] },
        },
        confirmedOrders: {
          $sum: { $cond: [{ $eq: ["$status", ORDER_STATUS.CONFIRMED] }, 1, 0] },
        },
        packedOrders: {
          $sum: { $cond: [{ $eq: ["$status", ORDER_STATUS.PACKED] }, 1, 0] },
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ["$status", ORDER_STATUS.SHIPPED] }, 1, 0] },
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ["$status", ORDER_STATUS.DELIVERED] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", ORDER_STATUS.CANCELLED] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalItems: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      packedOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
    }
  );
};

/**
 * Get daily orders trend
 */
orderSchema.statics.getDailyOrders = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
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
        revenue: { $sum: "$total" },
        average: { $avg: "$total" },
      },
    },
    {
      $sort: { "_id.date": 1 },
    },
  ]);
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Order", orderSchema);

