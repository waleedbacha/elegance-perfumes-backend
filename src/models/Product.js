/**
 * Product Model
 * Complete product schema with perfume-specific fields
 */

const mongoose = require("mongoose");
const {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUS,
  PRODUCT_TAGS,
} = require("../config/constants");

const productSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name must not exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      minlength: [50, "Description must be at least 50 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description must not exceed 200 characters"],
    },

    // ==========================================
    // CATEGORIZATION
    // ==========================================
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      // enum: Object.values(PRODUCT_CATEGORIES),
    },
    subcategory: {
      type: String,
      enum: [
        "eau-de-parfum",
        "eau-de-toilette",
        "parfum",
        "body-spray",
        "cologne",
      ],
    },
    // ✅ Remove enum restriction for tags - accept any strings
    tags: {
      type: [String],
      default: [],
    },

    // ==========================================
    // PRICING
    // ==========================================
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be positive"],
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price must be positive"],
    },
    discount: {
      type: Number,
      min: [0, "Discount must be at least 0"],
      max: [100, "Discount cannot exceed 100%"],
      default: 0,
    },
    isOnSale: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // PERFUME SPECIFIC
    // ==========================================
    notes: {
      top: {
        type: [String],
        validate: {
          validator: function (v) {
            return v.length <= 10;
          },
          message: "Top notes cannot exceed 10",
        },
      },
      middle: {
        type: [String],
        validate: {
          validator: function (v) {
            return v.length <= 10;
          },
          message: "Middle notes cannot exceed 10",
        },
      },
      base: {
        type: [String],
        validate: {
          validator: function (v) {
            return v.length <= 10;
          },
          message: "Base notes cannot exceed 10",
        },
      },
      description: String,
    },
    longevity: {
      type: Number,
      min: [1, "Longevity must be at least 1 hour"],
      max: [24, "Longevity cannot exceed 24 hours"],
    },
    intensity: {
      type: String,
      enum: ["soft", "moderate", "intense", "extreme"],
    },
    sillage: {
      type: String,
      enum: ["subtle", "moderate", "strong", "heavy"],
    },
    // ✅ Remove enum restriction for season - accept any strings
    season: {
      type: [String],
      default: [],
    },
    // ✅ Remove enum restriction for occasion - accept any strings
    occasion: {
      type: [String],
      default: [],
    },

    // ==========================================
    // INVENTORY
    // ==========================================
    sizes: [
      {
        size: {
          type: String, // ✅ Remove enum - accept any size like "60ml", "90ml", "105ml"
          required: true,
        },
        stock: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        price: {
          type: Number,
          min: 0,
        },
        comparePrice: {
          type: Number,
          min: 0,
        },
        discount: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        sku: {
          type: String,
          trim: true,
        },
        weight: {
          type: Number,
          min: 0,
        },
        dimensions: {
          length: Number,
          width: Number,
          height: Number,
        },
      },
    ],
    totalStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    stockStatus: {
      type: String,
      enum: ["in-stock", "low-stock", "out-of-stock", "discontinued"],
      default: "out-of-stock",
    },

    // ==========================================
    // MEDIA
    // ==========================================
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: String,
        alt: String,
        isMain: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          default: 0,
        },
        width: Number,
        height: Number,
        size: Number,
        format: String,
      },
    ],
    video: {
      url: String,
      thumbnail: String,
      publicId: String,
    },
    thumbnail: {
      url: String,
      publicId: String,
    },

    // ==========================================
    // SEO
    // ==========================================
    metaTitle: {
      type: String,
      maxlength: 60,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },
    metaKeywords: [String],

    // ==========================================
    // RATINGS & REVIEWS
    // ==========================================
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (v) => Math.round(v * 10) / 10,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
      distribution: {
        1: { type: Number, default: 0, min: 0 },
        2: { type: Number, default: 0, min: 0 },
        3: { type: Number, default: 0, min: 0 },
        4: { type: Number, default: 0, min: 0 },
        5: { type: Number, default: 0, min: 0 },
      },
    },

    // ==========================================
    // STATUS & FEATURES
    // ==========================================
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.DRAFT,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNew: {
      type: Boolean,
      default: true,
    },
    isLimited: {
      type: Boolean,
      default: false,
    },
    isPremium: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // RELATED PRODUCTS
    // ==========================================
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    frequentlyBoughtWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // ==========================================
    // STATISTICS
    // ==========================================
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    wishlistCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // RELEASE
    // ==========================================
    releaseDate: Date,
    expiryDate: Date,

    // ==========================================
    // SUPPLIER
    // ==========================================
    supplier: {
      name: String,
      contact: String,
      email: String,
      phone: String,
    },

    // ==========================================
    // WEIGHT & DIMENSIONS
    // ==========================================
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    suppressReservedKeysWarning: true,
  },
);

// ==========================================
// INDEXES FOR PERFORMANCE
// ==========================================
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ "sizes.sku": 1 }, { unique: true, sparse: true });

// Text search index
productSchema.index(
  {
    name: "text",
    description: "text",
    brand: "text",
    "notes.top": "text",
    "notes.middle": "text",
    "notes.base": "text",
  },
  {
    weights: {
      name: 10,
      brand: 8,
      "notes.top": 5,
      "notes.middle": 5,
      "notes.base": 5,
      description: 3,
    },
    default_language: "none",
  },
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ "ratings.average": -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ totalStock: 1 });
productSchema.index({ isFeatured: 1, status: 1 });
productSchema.index({ isNew: 1, status: 1 });
productSchema.index({ category: 1, price: 1, status: 1 });
productSchema.index({ brand: 1, category: 1, status: 1 });
productSchema.index({ isFeatured: 1, "ratings.average": -1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
productSchema.virtual("discountPercentage").get(function () {
  if (!this.comparePrice || this.comparePrice <= 0) return 0;
  return Math.round(
    ((this.comparePrice - this.price) / this.comparePrice) * 100,
  );
});

productSchema.virtual("inStock").get(function () {
  return this.totalStock > 0;
});

productSchema.virtual("isLowStock").get(function () {
  return this.totalStock > 0 && this.totalStock <= this.lowStockThreshold;
});

productSchema.virtual("priceFormatted").get(function () {
  return `PKR ${this.price.toLocaleString()}`;
});

productSchema.virtual("totalReviews").get(function () {
  return this.ratings.count;
});

productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
  options: { sort: { createdAt: -1 }, limit: 10 },
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
productSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (this.comparePrice && this.comparePrice > this.price) {
    if (!this.discount || this.discount === 0) {
      this.discount = Math.round(
        ((this.comparePrice - this.price) / this.comparePrice) * 100,
      );
    }
  }

  if (this.sizes && this.sizes.length > 0) {
    this.totalStock = this.sizes.reduce(
      (sum, size) => sum + (size.stock || 0),
      0,
    );
  }

  if (this.totalStock <= 0) {
    this.stockStatus = "out-of-stock";
  } else if (this.totalStock <= this.lowStockThreshold) {
    this.stockStatus = "low-stock";
  } else {
    this.stockStatus = "in-stock";
  }

  this.isOnSale =
    this.discount > 0 || (this.comparePrice && this.comparePrice > this.price);

  if (!this.thumbnail && this.images && this.images.length > 0) {
    const mainImage = this.images.find((img) => img.isMain) || this.images[0];
    if (mainImage) {
      this.thumbnail = {
        url: mainImage.url,
        publicId: mainImage.publicId,
      };
    }
  }

  if (this.images && this.images.length > 0) {
    const hasMain = this.images.some((img) => img.isMain);
    if (!hasMain) {
      this.images[0].isMain = true;
    }
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================
productSchema.methods.hasStock = function (size, quantity = 1) {
  if (!size) {
    return this.totalStock >= quantity;
  }

  const sizeItem = this.sizes.find((s) => s.size === size);
  if (!sizeItem) return false;
  return sizeItem.stock >= quantity;
};

productSchema.methods.updateStock = async function (
  size,
  quantity,
  operation = "subtract",
) {
  if (!size) {
    this.totalStock =
      operation === "subtract"
        ? this.totalStock - quantity
        : this.totalStock + quantity;
  } else {
    const sizeItem = this.sizes.find((s) => s.size === size);
    if (!sizeItem) {
      throw new Error("Size not found");
    }

    if (operation === "subtract" && sizeItem.stock < quantity) {
      throw new Error("Insufficient stock");
    }

    sizeItem.stock =
      operation === "subtract"
        ? sizeItem.stock - quantity
        : sizeItem.stock + quantity;
    this.totalStock = this.sizes.reduce((sum, s) => sum + s.stock, 0);
  }

  if (this.totalStock <= 0) {
    this.stockStatus = "out-of-stock";
  } else if (this.totalStock <= this.lowStockThreshold) {
    this.stockStatus = "low-stock";
  } else {
    this.stockStatus = "in-stock";
  }

  await this.save();
  return this;
};

productSchema.methods.getAvailableSizes = function () {
  return this.sizes.filter((s) => s.stock > 0).map((s) => s.size);
};

productSchema.methods.getPriceForSize = function (size) {
  const sizeItem = this.sizes.find((s) => s.size === size);
  if (!sizeItem) return this.price;
  return sizeItem.price || this.price;
};

// ==========================================
// STATIC METHODS
// ==========================================
productSchema.statics.searchProducts = async function (
  searchTerm,
  filters = {},
) {
  const query = {};

  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }

  if (filters.category) query.category = filters.category;
  if (filters.brand) query.brand = filters.brand;
  if (filters.status) query.status = filters.status;
  if (filters.tags) query.tags = { $in: filters.tags };
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }
  if (filters.rating) {
    query["ratings.average"] = { $gte: filters.rating };
  }
  if (filters.inStock) {
    query.totalStock = { $gt: 0 };
  }

  return this.find(query);
};

productSchema.statics.getFeatured = async function (limit = 10) {
  return this.find({ isFeatured: true, status: "active" })
    .sort({ "ratings.average": -1, purchasedCount: -1 })
    .limit(limit);
};

productSchema.statics.getNewArrivals = async function (limit = 10) {
  return this.find({ status: "active" }).sort({ createdAt: -1 }).limit(limit);
};

productSchema.statics.getBestSellers = async function (limit = 10) {
  return this.find({ status: "active" })
    .sort({ purchasedCount: -1 })
    .limit(limit);
};

productSchema.statics.paginate = async function (query = {}, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    select = "-__v",
    populate = "",
  } = options;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    this.find(query)
      .select(select)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate),
    this.countDocuments(query),
  ]);

  return {
    products,
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

module.exports = mongoose.model("Product", productSchema);
