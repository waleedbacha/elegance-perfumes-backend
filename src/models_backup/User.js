/**
 * User Model
 * Complete user schema with optimization
 */

const mongoose = require("mongoose");
const bcryptUtils = require("../utils/bcrypt");
const {
  USER_ROLES,
  USER_STATUS,
  LOYALTY_TIERS,
} = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // PERSONAL INFORMATION
    // ==========================================
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must not exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^[\+]?[0-9]{10,15}$/, "Please enter a valid phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // ==========================================
    // ACCOUNT DETAILS
    // ==========================================
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // PROFILE INFORMATION
    // ==========================================
    profilePicture: {
      url: String,
      publicId: String,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },

    // ==========================================
    // ADDRESS INFORMATION
    // ==========================================
    addresses: [
      {
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
          match: [/^\d{5}$/, "Please enter a valid 5-digit zip code"],
        },
        country: {
          type: String,
          default: "Pakistan",
          trim: true,
        },
        landmark: {
          type: String,
          trim: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        type: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        deliveryInstructions: String,
      },
    ],

    // ==========================================
    // LOYALTY PROGRAM
    // ==========================================
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyTier: {
      type: String,
      enum: Object.values(LOYALTY_TIERS),
      default: LOYALTY_TIERS.BRONZE,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsHistory: [
      {
        points: Number,
        type: {
          type: String,
          enum: ["earned", "redeemed", "bonus", "expired"],
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        description: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================
    // PREFERENCES
    // ==========================================
    preferences: {
      favoriteCategories: [String],
      favoriteBrands: [String],
      preferredNotes: [String],
      scentProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScentProfile",
      },
      receiveNewsletter: {
        type: Boolean,
        default: true,
      },
      receivePromotions: {
        type: Boolean,
        default: true,
      },
      receiveOrderUpdates: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: "en",
      },
      currency: {
        type: String,
        default: "PKR",
      },
    },

    // ==========================================
    // SECURITY
    // ==========================================
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
    verificationToken: String,
    verificationExpiry: Date,
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: Date,
    lastPasswordChange: Date,

    // ==========================================
    // ACTIVITY
    // ==========================================
    lastLogin: Date,
    lastActivity: Date,
    lastIPAddress: String,
    lastUserAgent: String,
    deviceInfo: {
      type: mongoose.Schema.Types.Mixed,
    },

    // ==========================================
    // WISHLIST & CART (References)
    // ==========================================
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    cart: {
      items: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
          },
          size: String,
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      totalItems: {
        type: Number,
        default: 0,
      },
      totalPrice: {
        type: Number,
        default: 0,
      },
      lastUpdated: Date,
    },

    // ==========================================
    // REVIEWS (Reference)
    // ==========================================
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
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
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ loyaltyTier: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "addresses.city": 1 });
userSchema.index({ lastLogin: -1 });

// Compound indexes for common queries
userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1, status: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
userSchema.virtual("fullName").get(function () {
  return this.name;
});

userSchema.virtual("defaultAddress").get(function () {
  return (
    this.addresses.find((addr) => addr.isDefault) || this.addresses[0] || null
  );
});

userSchema.virtual("hasAddress").get(function () {
  return this.addresses && this.addresses.length > 0;
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
userSchema.pre("save", async function (next) {
  // Only hash password if modified
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcryptUtils.hashPassword(this.password);
    this.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamps
userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Compare provided password with stored hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcryptUtils.comparePassword(candidatePassword, this.password);
};

/**
 * Check if account is locked
 */
userSchema.methods.isLocked = function () {
  if (!this.lockedUntil) return false;
  return this.lockedUntil > new Date();
};

/**
 * Get account lock time remaining
 */
userSchema.methods.getLockTimeRemaining = function () {
  if (!this.lockedUntil) return 0;
  const remaining = this.lockedUntil - new Date();
  return Math.max(0, Math.ceil(remaining / 1000 / 60)); // minutes
};

/**
 * Increment login attempts
 */
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;

  // Lock account after 5 failed attempts
  if (this.loginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }

  await this.save({ validateBeforeSave: false });
};

/**
 * Reset login attempts
 */
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  await this.save({ validateBeforeSave: false });
};

/**
 * Add loyalty points
 */
userSchema.methods.addLoyaltyPoints = async function (
  points,
  orderId,
  description,
) {
  this.loyaltyPoints += points;
  this.totalSpent += points * 0.1; // Example: 1 point = Rs. 1 spent

  // Update loyalty tier based on total spent
  if (this.totalSpent >= 100000) {
    this.loyaltyTier = LOYALTY_TIERS.PLATINUM;
  } else if (this.totalSpent >= 50000) {
    this.loyaltyTier = LOYALTY_TIERS.GOLD;
  } else if (this.totalSpent >= 25000) {
    this.loyaltyTier = LOYALTY_TIERS.SILVER;
  } else {
    this.loyaltyTier = LOYALTY_TIERS.BRONZE;
  }

  this.pointsHistory.push({
    points,
    type: "earned",
    orderId,
    description: description || `Earned ${points} points from order`,
  });

  await this.save();
};

/**
 * Redeem loyalty points
 */
userSchema.methods.redeemLoyaltyPoints = async function (points, description) {
  if (this.loyaltyPoints < points) {
    throw new Error("Insufficient loyalty points");
  }

  this.loyaltyPoints -= points;

  this.pointsHistory.push({
    points: -points,
    type: "redeemed",
    description: description || `Redeemed ${points} points`,
  });

  await this.save();
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Find user by email or phone
 */
userSchema.statics.findByEmailOrPhone = function (identifier) {
  return this.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
  });
};

/**
 * Get active users count
 */
userSchema.statics.getActiveUsersCount = function () {
  return this.countDocuments({ status: USER_STATUS.ACTIVE });
};

/**
 * Get users by role
 */
userSchema.statics.getUsersByRole = function (role) {
  return this.find({ role, status: USER_STATUS.ACTIVE });
};

/**
 * Get top customers by spending
 */
userSchema.statics.getTopCustomers = function (limit = 10) {
  return this.find({ status: USER_STATUS.ACTIVE })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .select("name email totalSpent loyaltyTier orderCount");
};

/**
 * Get new customers (last 30 days)
 */
userSchema.statics.getNewCustomers = function (days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.find({
    createdAt: { $gte: date },
    status: USER_STATUS.ACTIVE,
  });
};

// ==========================================
// QUERY HELPERS
// ==========================================

/**
 * Get users with pagination
 */
userSchema.statics.paginate = async function (query = {}, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    select = "-password -refreshTokens -resetPasswordToken -verificationToken",
  } = options;

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    this.find(query).select(select).sort(sort).skip(skip).limit(limit),
    this.countDocuments(query),
  ]);

  return {
    users,
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

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("User", userSchema);

