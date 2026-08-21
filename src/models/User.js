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

      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    // Replace the phone field with this:
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow null/empty for OAuth users
          // Remove all non-numeric
          const cleaned = v.replace(/\D/g, "");
          // Check if it's a valid Pakistan number (92 + 10 digits)
          if (cleaned.startsWith("92") && cleaned.length === 12) return true;
          // Check if it's a valid number without country code (10-15 digits)
          if (cleaned.length >= 10 && cleaned.length <= 15) return true;
          return false;
        },
        message: "Please enter a valid phone number",
      },
      set: function (v) {
        if (!v) return v;
        // Remove all non-numeric
        let cleaned = v.replace(/\D/g, "");
        // Remove leading 0
        if (cleaned.startsWith("0")) {
          cleaned = cleaned.substring(1);
        }
        // Add 92 if not present and not empty
        if (cleaned.length > 0 && !cleaned.startsWith("92")) {
          cleaned = `92${cleaned}`;
        }
        return cleaned;
      },
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
// INDEXES FOR PERFORMANCE - ONLY HERE
// ==========================================
userSchema.index({ email: 1 }, {});
userSchema.index({ phone: 1 }, {});
userSchema.index({ role: 1, status: 1 });
userSchema.index({ loyaltyTier: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "addresses.city": 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1, status: 1 });

// ==========================================
// VIRTUAL FIELDS - SAFER
// ==========================================

userSchema.virtual("fullName").get(function () {
  return this.name || "";
});

userSchema.virtual("defaultAddress").get(function () {
  if (
    !this.addresses ||
    !Array.isArray(this.addresses) ||
    this.addresses.length === 0
  ) {
    return null;
  }
  return (
    this.addresses.find((addr) => addr.isDefault) || this.addresses[0] || null
  );
});

userSchema.virtual("hasAddress").get(function () {
  return (
    this.addresses && Array.isArray(this.addresses) && this.addresses.length > 0
  );
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcryptUtils.hashPassword(this.password);
    this.lastPasswordChange = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcryptUtils.comparePassword(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  if (!this.lockedUntil) return false;
  return this.lockedUntil > new Date();
};

userSchema.methods.getLockTimeRemaining = function () {
  if (!this.lockedUntil) return 0;
  const remaining = this.lockedUntil - new Date();
  return Math.max(0, Math.ceil(remaining / 1000 / 60));
};

userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.addLoyaltyPoints = async function (
  points,
  orderId,
  description,
) {
  this.loyaltyPoints += points;
  this.totalSpent += points * 0.1;
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
// STATIC METHODS - FIXED
// ==========================================

userSchema.statics.findByEmailOrPhone = function (identifier) {
  return this.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
  });
};

userSchema.statics.getActiveUsersCount = function () {
  return this.countDocuments({ status: USER_STATUS.ACTIVE });
};

userSchema.statics.getUsersByRole = function (role) {
  return this.find({ role, status: USER_STATUS.ACTIVE });
};

userSchema.statics.getTopCustomers = function (limit = 10) {
  return this.find({ status: USER_STATUS.ACTIVE })
    .sort({ totalSpent: -1 })
    .limit(limit)
    .select("name email totalSpent loyaltyTier orderCount");
};

userSchema.statics.getNewCustomers = function (days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return this.find({
    createdAt: { $gte: date },
    status: USER_STATUS.ACTIVE,
  });
};

// ✅ FIXED: Safer paginate method with proper error handling
userSchema.statics.paginate = async function (query = {}, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      select = "-password -refreshTokens -resetPasswordToken -verificationToken",
    } = options;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.find(query).select(select).sort(sort).skip(skip).limit(limit).lean(), // ✅ Add .lean() to avoid virtual field issues
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
  } catch (error) {
    console.error("❌ Paginate error:", error);
    // ✅ Return empty result on error
    return {
      users: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
};

module.exports = mongoose.model("User", userSchema);
