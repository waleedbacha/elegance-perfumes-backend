/**
 * Wishlist Model
 * User wishlist management
 */

const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER REFERENCE
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ==========================================
    // WISHLIST ITEMS
    // ==========================================
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
        // Price at the time of adding
        priceSnapshot: {
          price: Number,
          discount: Number,
          comparePrice: Number,
        },
        // Notification preferences
        notifyOnPriceDrop: {
          type: Boolean,
          default: false,
        },
        notifyOnBackInStock: {
          type: Boolean,
          default: false,
        },
        // Price drop tracking
        priceDropNotified: {
          type: Boolean,
          default: false,
        },
        backInStockNotified: {
          type: Boolean,
          default: false,
        },
        lastPriceCheck: Date,
        lowestPrice: Number,
        priceHistory: [
          {
            price: Number,
            date: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // ==========================================
    // WISHLIST METADATA
    // ==========================================
    name: {
      type: String,
      default: "My Wishlist",
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    shareableLink: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ==========================================
    // STATISTICS
    // ==========================================
    totalItems: {
      type: Number,
      default: 0,
    },
    totalValue: {
      type: Number,
      default: 0,
    },

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
wishlistSchema.index({ user: 1 }, { unique: true });
wishlistSchema.index({ "items.product": 1 });
wishlistSchema.index({ shareableLink: 1 });
wishlistSchema.index({ createdAt: -1 });

// Compound indexes
wishlistSchema.index({ user: 1, "items.product": 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
wishlistSchema.virtual("isEmpty").get(function () {
  return this.items.length === 0;
});

wishlistSchema.virtual("isNotEmpty").get(function () {
  return this.items.length > 0;
});

wishlistSchema.virtual("productIds").get(function () {
  return this.items.map((item) => item.product);
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
wishlistSchema.pre("save", function (next) {
  // Update total items
  this.totalItems = this.items.length;

  // Calculate total value
  this.totalValue = this.items.reduce((sum, item) => {
    const price = item.priceSnapshot?.price || 0;
    return sum + price;
  }, 0);

  // Generate shareable link if public and not exists
  if (this.isPublic && !this.shareableLink) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.shareableLink = `wishlist/${timestamp}-${random}`;
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Add product to wishlist
 */
wishlistSchema.methods.addProduct = async function (productData) {
  const { productId, priceData = {}, notes = "" } = productData;

  // Check if already exists
  const existingItem = this.items.find(
    (item) => item.product.toString() === productId.toString(),
  );

  if (existingItem) {
    // Update existing item
    existingItem.notes = notes || existingItem.notes;
    existingItem.priceSnapshot = {
      price: priceData.price || existingItem.priceSnapshot?.price,
      discount: priceData.discount || existingItem.priceSnapshot?.discount,
      comparePrice:
        priceData.comparePrice || existingItem.priceSnapshot?.comparePrice,
    };
    existingItem.addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      product: productId,
      addedAt: new Date(),
      notes,
      priceSnapshot: {
        price: priceData.price || 0,
        discount: priceData.discount || 0,
        comparePrice: priceData.comparePrice || 0,
      },
      lastPriceCheck: new Date(),
      lowestPrice: priceData.price || 0,
      priceHistory: [
        {
          price: priceData.price || 0,
          date: new Date(),
        },
      ],
    });
  }

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Remove product from wishlist
 */
wishlistSchema.methods.removeProduct = async function (productId) {
  this.items = this.items.filter(
    (item) => item.product.toString() !== productId.toString(),
  );

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Check if product is in wishlist
 */
wishlistSchema.methods.hasProduct = function (productId) {
  return this.items.some(
    (item) => item.product.toString() === productId.toString(),
  );
};

/**
 * Toggle product in wishlist
 */
wishlistSchema.methods.toggleProduct = async function (
  productId,
  productData = {},
) {
  if (this.hasProduct(productId)) {
    await this.removeProduct(productId);
    return { action: "removed", inWishlist: false };
  } else {
    await this.addProduct({ productId, ...productData });
    return { action: "added", inWishlist: true };
  }
};

/**
 * Update price for all items
 */
wishlistSchema.methods.updatePrices = async function (productPrices) {
  for (const item of this.items) {
    const priceData = productPrices[item.product.toString()];
    if (priceData) {
      const oldPrice = item.priceSnapshot?.price || 0;

      // Check if price changed
      if (priceData.price !== oldPrice) {
        // Add to price history
        item.priceHistory.push({
          price: priceData.price,
          date: new Date(),
        });

        // Update lowest price
        if (priceData.price < (item.lowestPrice || Infinity)) {
          item.lowestPrice = priceData.price;
        }

        // Check for price drop
        if (priceData.price < oldPrice) {
          item.priceDropNotified = false;
        }

        // Update price snapshot
        item.priceSnapshot = {
          price: priceData.price,
          discount: priceData.discount || 0,
          comparePrice: priceData.comparePrice || 0,
        };

        item.lastPriceCheck = new Date();
      }
    }
  }

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Get price drop items
 */
wishlistSchema.methods.getPriceDropItems = function () {
  return this.items.filter(
    (item) => item.priceSnapshot?.price < (item.lowestPrice || Infinity),
  );
};

/**
 * Get out of stock items
 */
wishlistSchema.methods.getOutOfStockItems = function (stockStatuses) {
  return this.items.filter(
    (item) => stockStatuses[item.product.toString()] === "out-of-stock",
  );
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get wishlist by user
 */
wishlistSchema.statics.getByUser = async function (userId) {
  let wishlist = await this.findOne({ user: userId });

  if (!wishlist) {
    wishlist = new this({ user: userId });
    await wishlist.save();
  }

  return wishlist;
};

/**
 * Get popular wishlist items
 */
wishlistSchema.statics.getPopularItems = async function (limit = 10) {
  const popular = await this.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $project: {
        product: 1,
        wishlistCount: "$count",
      },
    },
  ]);

  return popular;
};

/**
 * Get wishlist statistics
 */
wishlistSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalItems: { $sum: "$totalItems" },
        averageItems: { $avg: "$totalItems" },
        totalValue: { $sum: "$totalValue" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalUsers: 0,
      totalItems: 0,
      averageItems: 0,
      totalValue: 0,
    }
  );
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Wishlist", wishlistSchema);

