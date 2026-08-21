/**
 * Coupon Model
 * Discount coupons and promotional codes
 */

const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9]{4,20}$/,
        "Coupon code must be 4-20 alphanumeric characters"]},
    name: {
      type: String,
      required: [true, "Coupon name is required"],
      trim: true,
      maxlength: [100, "Name must not exceed 100 characters"]},
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must not exceed 500 characters"]},

    // ==========================================
    // DISCOUNT CONFIGURATION
    // ==========================================
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true},
    discountValue: {
      type: Number,
      required: true,
      min: [0, "Discount value must be positive"],
      validate: {
        validator: function (v) {
          if (this.discountType === "percentage") {
            return v <= 100;
          }
          return true;
        },
        message: "Percentage discount cannot exceed 100%"}},
    maxDiscount: {
      type: Number,
      min: 0,
      description: "Maximum discount amount for percentage coupons"},
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
      description: "Minimum order amount required to use coupon"},

    // ==========================================
    // VALIDITY
    // ==========================================
    validFrom: {
      type: Date,
      required: true},
    validUntil: {
      type: Date,
      required: true},
    isActive: {
      type: Boolean,
      default: true},

    // ==========================================
    // USAGE LIMITS
    // ==========================================
    usageLimit: {
      type: Number,
      default: 1,
      min: 1},
    usedCount: {
      type: Number,
      default: 0,
      min: 0},
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1},

    // ==========================================
    // APPLICABILITY
    // ==========================================
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"}],
    applicableCategories: [
      {
        type: String}],
    applicableBrands: [
      {
        type: String}],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"}],
    excludedCategories: [
      {
        type: String}],

    // ==========================================
    // USER RESTRICTIONS
    // ==========================================
    userRestrictions: {
      isFirstOrder: {
        type: Boolean,
        default: false},
      minOrderCount: {
        type: Number,
        default: 0},
      userTiers: [
        {
          type: String,
          enum: ["bronze", "silver", "gold", "platinum"]}],
      specificUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"}]},

    // ==========================================
    // USAGE TRACKING
    // ==========================================
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"},
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order"},
        discountAmount: Number,
        orderAmount: Number,
        usedAt: {
          type: Date,
          default: Date.now}}],

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: {
      type: Date,
      default: Date.now},
    updatedAt: {
      type: Date,
      default: Date.now}},
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }},
);

// ==========================================
// INDEXES FOR PERFORMANCE
// ==========================================
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ validFrom: 1, validUntil: 1 });
couponSchema.index({ isActive: 1, validUntil: 1 });
couponSchema.index({ usedCount: 1, usageLimit: 1 });
couponSchema.index({ "userRestrictions.userTiers": 1 });

// Compound indexes
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ discountType: 1, discountValue: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
couponSchema.virtual("isValid").get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    this.usedCount < this.usageLimit
  );
});

couponSchema.virtual("isExpired").get(function () {
  return new Date() > this.validUntil;
});

couponSchema.virtual("usageRemaining").get(function () {
  return Math.max(0, this.usageLimit - this.usedCount);
});

couponSchema.virtual("discountDisplay").get(function () {
  if (this.discountType === "percentage") {
    return `${this.discountValue}% OFF`;
  }
  return `PKR ${this.discountValue.toLocaleString()} OFF`;
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Check if coupon is valid for use
 */
couponSchema.methods.isValidForUse = async function (
  userId,
  orderAmount = 0,
  products = [],
) {
  // Check basic validity
  if (!this.isActive) {
    return { valid: false, reason: "Coupon is inactive" };
  }

  const now = new Date();
  if (now < this.validFrom) {
    return { valid: false, reason: "Coupon is not yet active" };
  }

  if (now > this.validUntil) {
    return { valid: false, reason: "Coupon has expired" };
  }

  if (this.usedCount >= this.usageLimit) {
    return { valid: false, reason: "Coupon usage limit reached" };
  }

  // Check minimum order amount
  if (orderAmount < this.minOrderAmount) {
    return {
      valid: false,
      reason: `Minimum order amount of PKR ${this.minOrderAmount.toLocaleString()} required`};
  }

  // Check user restrictions
  if (userId) {
    // Check per user limit
    const userUsage = this.usedBy.filter(
      (u) => u.user.toString() === userId.toString(),
    );
    if (userUsage.length >= this.perUserLimit) {
      return {
        valid: false,
        reason: `You have already used this coupon ${this.perUserLimit} time(s)`};
    }

    // Check user tier
    if (
      this.userRestrictions.userTiers &&
      this.userRestrictions.userTiers.length > 0
    ) {
      const User = mongoose.model("User");
      const user = await User.findById(userId);
      if (
        !user ||
        !this.userRestrictions.userTiers.includes(user.loyaltyTier)
      ) {
        return {
          valid: false,
          reason: "This coupon is not available for your loyalty tier"};
      }
    }

    // Check first order restriction
    if (this.userRestrictions.isFirstOrder) {
      const Order = mongoose.model("Order");
      const orderCount = await Order.countDocuments({ user: userId });
      if (orderCount > 0) {
        return {
          valid: false,
          reason: "This coupon is only for first-time customers"};
      }
    }

    // Check specific users
    if (
      this.userRestrictions.specificUsers &&
      this.userRestrictions.specificUsers.length > 0
    ) {
      if (!this.userRestrictions.specificUsers.includes(userId)) {
        return {
          valid: false,
          reason: "This coupon is not available for your account"};
      }
    }
  }

  // Check product applicability
  if (products && products.length > 0) {
    // Check excluded products
    if (this.excludedProducts && this.excludedProducts.length > 0) {
      const hasExcluded = products.some((p) =>
        this.excludedProducts.includes(p.toString()),
      );
      if (hasExcluded) {
        return {
          valid: false,
          reason: "This coupon is not applicable to some products in your cart"};
      }
    }

    // Check applicable products (if specified)
    if (this.applicableProducts && this.applicableProducts.length > 0) {
      const hasApplicable = products.some((p) =>
        this.applicableProducts.includes(p.toString()),
      );
      if (!hasApplicable) {
        return {
          valid: false,
          reason: "This coupon is not applicable to any products in your cart"};
      }
    }
  }

  return { valid: true };
};

/**
 * Calculate discount amount
 */
couponSchema.methods.calculateDiscount = function (orderAmount) {
  let discount = 0;

  if (this.discountType === "percentage") {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = Math.min(this.discountValue, orderAmount);
  }

  return Math.round(discount * 100) / 100;
};

/**
 * Use coupon
 */
couponSchema.methods.useCoupon = async function (
  userId,
  orderId,
  discountAmount,
  orderAmount,
) {
  this.usedCount += 1;

  this.usedBy.push({
    user: userId,
    order: orderId,
    discountAmount,
    orderAmount,
    usedAt: new Date()});

  await this.save();
  return this;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get active coupons
 */
couponSchema.statics.getActiveCoupons = async function (filters = {}) {
  const query = {
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() },
    ...filters};

  return this.find(query).sort({ createdAt: -1 }).select("-usedBy");
};

/**
 * Validate coupon code
 */
couponSchema.statics.validateCoupon = async function (
  code,
  userId,
  orderAmount = 0,
  products = [],
) {
  const coupon = await this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() }});

  if (!coupon) {
    return {
      valid: false,
      reason: "Invalid coupon code"};
  }

  return await coupon.isValidForUse(userId, orderAmount, products);
};

/**
 * Get coupon usage statistics
 */
couponSchema.statics.getUsageStats = async function (couponId) {
  const coupon = await this.findById(couponId).populate(
    "usedBy.user",
    "name email",
  );

  if (!coupon) {
    return null;
  }

  return {
    totalUsage: coupon.usedCount,
    totalDiscount: coupon.usedBy.reduce((sum, u) => sum + u.discountAmount, 0),
    uniqueUsers: coupon.usedBy.length,
    averageDiscount:
      coupon.usedBy.length > 0
        ? coupon.usedBy.reduce((sum, u) => sum + u.discountAmount, 0) /
          coupon.usedBy.length
        : 0,
    users: coupon.usedBy.map((u) => ({
      name: u.user?.name || "Unknown",
      email: u.user?.email || "Unknown",
      discountAmount: u.discountAmount,
      orderAmount: u.orderAmount,
      usedAt: u.usedAt}))};
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Coupon", couponSchema);


