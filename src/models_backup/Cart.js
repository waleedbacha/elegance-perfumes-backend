/**
 * Cart Model
 * Shopping cart management with session support
 */

const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER REFERENCE (Optional - for guest carts)
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    sessionId: {
      type: String,
      sparse: true,
      description: "For guest users without account",
    },

    // ==========================================
    // CART ITEMS
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
        image: String,
        size: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          max: 99,
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
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],

    // ==========================================
    // COUPON
    // ==========================================
    coupon: {
      code: String,
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      appliedAt: Date,
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
      },
    },

    // ==========================================
    // PRICING SUMMARY
    // ==========================================
    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // SHIPPING ADDRESS (Snapshot)
    // ==========================================
    shippingAddress: {
      name: String,
      phone: String,
      street: String,
      area: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      landmark: String,
      deliveryInstructions: String,
    },

    // ==========================================
    // SELECTED SHIPPING METHOD
    // ==========================================
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "same-day"],
    },

    // ==========================================
    // CART STATUS
    // ==========================================
    status: {
      type: String,
      enum: ["active", "abandoned", "converted", "expired"],
      default: "active",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },

    // ==========================================
    // CONVERSION TRACKING
    // ==========================================
    convertedAt: Date,
    convertedToOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

    // ==========================================
    // ANALYTICS
    // ==========================================
    source: {
      type: String,
      enum: ["website", "whatsapp", "admin", "mobile-app"],
      default: "website",
    },
    referrer: String,
    ipAddress: String,
    userAgent: String,

    // ==========================================
    // ABANDONED CART RECOVERY
    // ==========================================
    recoveryEmails: [
      {
        sentAt: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ["initial", "reminder", "final"],
        },
        opened: {
          type: Boolean,
          default: false,
        },
        clicked: {
          type: Boolean,
          default: false,
        },
        converted: {
          type: Boolean,
          default: false,
        },
      },
    ],
    recoverySms: [
      {
        sentAt: {
          type: Date,
          default: Date.now,
        },
        delivered: {
          type: Boolean,
          default: false,
        },
        clicked: {
          type: Boolean,
          default: false,
        },
      },
    ],

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
cartSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { user: { $exists: true } } },
);
cartSchema.index(
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $exists: true } } },
);
cartSchema.index({ status: 1, lastActivity: 1 });
cartSchema.index({ expiresAt: 1 });
cartSchema.index({ "items.product": 1 });

// Compound indexes
cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ sessionId: 1, status: 1 });
cartSchema.index({ lastActivity: 1, status: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.virtual("uniqueItemCount").get(function () {
  return this.items.length;
});

cartSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

cartSchema.virtual("isEmpty").get(function () {
  return this.items.length === 0;
});

cartSchema.virtual("hasShippingAddress").get(function () {
  return !!(this.shippingAddress && this.shippingAddress.street);
});

cartSchema.virtual("totalBeforeDiscount").get(function () {
  return this.subtotal;
});

cartSchema.virtual("discountDisplay").get(function () {
  if (this.coupon.type === "percentage") {
    return `${this.coupon.discount}% OFF`;
  }
  return `PKR ${this.coupon.discount.toLocaleString()} OFF`;
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
cartSchema.pre("save", function (next) {
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Apply coupon discount
  let discount = this.coupon.discount || 0;
  if (this.coupon.type === "percentage") {
    discount = (this.subtotal * discount) / 100;
  }
  this.discount = Math.min(discount, this.subtotal);

  // Calculate tax (example: 5% GST)
  const taxableAmount = this.subtotal - this.discount;
  this.tax = taxableAmount * 0.05; // 5% tax

  // Calculate total
  this.total = taxableAmount + this.tax + (this.shipping || 0);

  // Update last activity
  this.lastActivity = new Date();

  // Set expiry if not set (7 days for guest, 30 days for logged in)
  if (!this.expiresAt) {
    const expiryDays = this.user ? 30 : 7;
    this.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Add item to cart
 */
cartSchema.methods.addItem = async function (productData) {
  const {
    productId,
    name,
    brand,
    image,
    size,
    quantity,
    price,
    discount = 0,
  } = productData;

  // Check if item already exists
  const existingItem = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() && item.size === size,
  );

  if (existingItem) {
    // Update quantity
    existingItem.quantity += quantity;
    existingItem.totalPrice =
      existingItem.quantity * (existingItem.price - existingItem.discount);
  } else {
    // Add new item
    this.items.push({
      product: productId,
      name,
      brand,
      image,
      size,
      quantity,
      price,
      discount,
      totalPrice: quantity * (price - discount),
      addedAt: new Date(),
    });
  }

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Update item quantity
 */
cartSchema.methods.updateItemQuantity = async function (
  productId,
  size,
  quantity,
) {
  const item = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() && item.size === size,
  );

  if (!item) {
    throw new Error("Item not found in cart");
  }

  if (quantity <= 0) {
    // Remove item
    this.items = this.items.filter(
      (item) =>
        !(
          item.product.toString() === productId.toString() && item.size === size
        ),
    );
  } else {
    item.quantity = quantity;
    item.totalPrice = quantity * (item.price - item.discount);
  }

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Remove item from cart
 */
cartSchema.methods.removeItem = async function (productId, size) {
  this.items = this.items.filter(
    (item) =>
      !(item.product.toString() === productId.toString() && item.size === size),
  );

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Clear cart
 */
cartSchema.methods.clearCart = async function () {
  this.items = [];
  this.coupon = {};
  this.shippingAddress = {};
  this.shippingMethod = null;

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Apply coupon
 */
cartSchema.methods.applyCoupon = async function (couponData) {
  const { code, discount, type, couponId } = couponData;

  this.coupon = {
    code,
    discount,
    type,
    appliedAt: new Date(),
    couponId,
  };

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Remove coupon
 */
cartSchema.methods.removeCoupon = async function () {
  this.coupon = {};
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Set shipping address
 */
cartSchema.methods.setShippingAddress = async function (address) {
  this.shippingAddress = {
    name: address.name,
    phone: address.phone,
    street: address.street,
    area: address.area,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country || "Pakistan",
    landmark: address.landmark,
    deliveryInstructions: address.deliveryInstructions,
  };

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Set shipping method
 */
cartSchema.methods.setShippingMethod = async function (method, cost = 0) {
  this.shippingMethod = method;
  this.shipping = cost;

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Convert cart to order
 */
cartSchema.methods.convertToOrder = async function (orderId) {
  this.status = "converted";
  this.convertedAt = new Date();
  this.convertedToOrder = orderId;

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Mark as abandoned
 */
cartSchema.methods.markAbandoned = async function () {
  this.status = "abandoned";
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Record recovery email sent
 */
cartSchema.methods.recordRecoveryEmail = async function (type) {
  this.recoveryEmails.push({
    sentAt: new Date(),
    type,
  });

  this.updatedAt = new Date();
  await this.save();
  return this;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get or create cart for user
 */
cartSchema.statics.getOrCreateCart = async function (
  identifier,
  isUser = true,
) {
  let cart;

  if (isUser) {
    // User cart
    cart = await this.findOne({ user: identifier, status: "active" });
    if (!cart) {
      cart = new this({
        user: identifier,
        status: "active",
        lastActivity: new Date(),
      });
      await cart.save();
    }
  } else {
    // Guest cart by session
    cart = await this.findOne({ sessionId: identifier, status: "active" });
    if (!cart) {
      cart = new this({
        sessionId: identifier,
        status: "active",
        lastActivity: new Date(),
      });
      await cart.save();
    }
  }

  return cart;
};

/**
 * Merge guest cart into user cart
 */
cartSchema.statics.mergeCarts = async function (sessionId, userId) {
  const guestCart = await this.findOne({ sessionId, status: "active" });
  const userCart = await this.findOne({ user: userId, status: "active" });

  if (!guestCart || guestCart.isEmpty) {
    // No guest cart or empty, just return user cart
    return userCart || (await this.getOrCreateCart(userId, true));
  }

  if (!userCart) {
    // Transfer guest cart to user
    guestCart.user = userId;
    guestCart.sessionId = null;
    guestCart.updatedAt = new Date();
    await guestCart.save();
    return guestCart;
  }

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find(
      (item) =>
        item.product.toString() === guestItem.product.toString() &&
        item.size === guestItem.size,
    );

    if (existingItem) {
      existingItem.quantity += guestItem.quantity;
      existingItem.totalPrice =
        existingItem.quantity * (existingItem.price - existingItem.discount);
    } else {
      userCart.items.push(guestItem);
    }
  }

  // Update user cart
  userCart.updatedAt = new Date();
  await userCart.save();

  // Delete guest cart
  await guestCart.deleteOne();

  return userCart;
};

/**
 * Get abandoned carts for recovery
 */
cartSchema.statics.getAbandonedCarts = async function (hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    status: "active",
    lastActivity: { $lt: cutoff },
    "items.0": { $exists: true }, // Has items
    $or: [
      { user: { $exists: true, $ne: null } },
      { sessionId: { $exists: true, $ne: null } },
    ],
  }).populate("user", "name email phone");
};

/**
 * Get cart statistics
 */
cartSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        averageTotal: { $avg: "$total" },
        totalValue: { $sum: "$total" },
      },
    },
  ]);

  return stats;
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Cart", cartSchema);

