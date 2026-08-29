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
    },
    sessionId: {
      type: String,
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
        discountSource: {
          type: String,
          enum: ["product", "coupon", "manual"],
          default: "product",
        },
        discountPercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
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
    productDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponDiscount: {
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
  { sessionId: 1 },
  { unique: true, partialFilterExpression: { sessionId: { $exists: true } } },
);
cartSchema.index({ status: 1, lastActivity: 1 });
cartSchema.index({ expiresAt: 1 });
cartSchema.index({ "items.product": 1 });
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

// Cart.js - pre-save hook

cartSchema.pre("save", async function (next) {
  // Calculate subtotal from item totalPrice
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // ✅ Calculate product discount from items - ONLY use item.discount
  // This is the discount amount already calculated from the product
  this.productDiscount = this.items.reduce((sum, item) => {
    // ✅ Only add discount if it's from product (not coupon)
    if (item.discountSource === "product") {
      return sum + (item.discount || 0) * (item.quantity || 1);
    }
    return sum;
  }, 0);

  // ✅ Check if coupon is valid before applying
  let couponDiscount = 0;
  if (this.coupon && this.coupon.couponId) {
    try {
      const Coupon = mongoose.model("Coupon");
      const coupon = await Coupon.findById(this.coupon.couponId);

      if (!coupon || !coupon.isActive || new Date() > coupon.validUntil) {
        this.coupon = {};
      } else if (this.coupon.discount) {
        if (this.coupon.type === "percentage") {
          const discountPercent = Math.min(this.coupon.discount, 90);
          couponDiscount = (this.subtotal * discountPercent) / 100;
        } else {
          couponDiscount = this.coupon.discount;
        }
      }
    } catch (error) {
      this.coupon = {};
    }
  }

  this.couponDiscount = Math.min(couponDiscount, this.subtotal);

  // ✅ Total discount = product discount + coupon discount
  this.discount = this.productDiscount + this.couponDiscount;

  this.tax = 0;

  if (!this.shipping || this.shipping === 0) {
    this.shipping = 200;
  }

  // ✅ Total = subtotal + shipping - couponDiscount (product discount is already in subtotal)
  this.total = this.subtotal - this.couponDiscount + this.shipping;

  this.lastActivity = new Date();

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
// Cart.js - addItem method

// Cart.js - addItem method

cartSchema.methods.addItem = async function (productData) {
  const {
    productId,
    name,
    brand,
    image,
    size,
    quantity,
    price, // Original price
    discountAmount = 0,
    finalPrice = price,
    notes,
    discountPercentage = 0,
  } = productData;

  console.log("📦 Adding item to cart:");
  console.log(`  Product: ${name}`);
  console.log(`  Size: ${size}`);
  console.log(`  Quantity: ${quantity}`);
  console.log(`  Original Price: ${price}`);
  console.log(`  Discount Amount: ${discountAmount}`);
  console.log(`  Final Price: ${finalPrice}`);

  // Check if item already exists
  const existingItem = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() && item.size === size,
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.totalPrice =
      existingItem.quantity * (existingItem.price - existingItem.discount);
    console.log(
      `📦 Updated existing item, new quantity: ${existingItem.quantity}`,
    );
  } else {
    // ✅ Store EXACT values
    this.items.push({
      product: productId,
      name,
      brand,
      image,
      size,
      quantity,
      price: price, // Original price
      discount: discountAmount, // Exact discount amount
      totalPrice: quantity * finalPrice, // ✅ Use the exact final price
      addedAt: new Date(),
      notes,
      discountSource: "product",
      discountPercentage: discountPercentage,
    });
    console.log(`📦 Added new item with discount: ${discountAmount}`);
  }

  this.markModified("items");
  this.updatedAt = new Date();

  await this.save();
  console.log("✅ Cart saved. Items:", this.items.length);

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

  this.markModified("items");
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

  this.markModified("items");
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

  this.markModified("items");
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Apply coupon to cart
 */
cartSchema.methods.applyCoupon = async function (couponData) {
  const { code, discount, type, couponId } = couponData;

  this.coupon = {
    code,
    discount: discount, // Percentage value (e.g., 10 for 10%) or fixed amount
    type,
    appliedAt: new Date(),
    couponId,
  };

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Remove coupon from cart
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
 * Mark cart as abandoned
 */
cartSchema.methods.markAbandoned = async function () {
  this.status = "abandoned";
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Record recovery email
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
 * Get or create cart
 */
cartSchema.statics.getOrCreateCart = async function (
  identifier,
  isUser = true,
) {
  let cart;

  if (isUser) {
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
 * Merge guest cart with user cart
 */
cartSchema.statics.mergeCarts = async function (sessionId, userId) {
  const guestCart = await this.findOne({ sessionId, status: "active" });
  const userCart = await this.findOne({ user: userId, status: "active" });

  if (!guestCart || guestCart.isEmpty) {
    return userCart || (await this.getOrCreateCart(userId, true));
  }

  if (!userCart) {
    guestCart.user = userId;
    guestCart.sessionId = null;
    guestCart.updatedAt = new Date();
    await guestCart.save();
    return guestCart;
  }

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

  userCart.markModified("items");
  userCart.updatedAt = new Date();
  await userCart.save();

  await guestCart.deleteOne();

  return userCart;
};

/**
 * Get abandoned carts
 */
cartSchema.statics.getAbandonedCarts = async function (hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    status: "active",
    lastActivity: { $lt: cutoff },
    "items.0": { $exists: true },
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

module.exports = mongoose.model("Cart", cartSchema);
