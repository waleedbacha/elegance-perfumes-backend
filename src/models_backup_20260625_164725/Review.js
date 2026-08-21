/**
 * Review Model
 * Product reviews and ratings
 */

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // ==========================================
    // REFERENCES
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true},
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true},
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"},

    // ==========================================
    // REVIEW CONTENT
    // ==========================================
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5},
    title: {
      type: String,
      trim: true,
      maxlength: 100},
    comment: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
      trim: true},

    // ==========================================
    // PROS & CONS
    // ==========================================
    pros: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: "Cannot have more than 5 pros"}},
    cons: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: "Cannot have more than 5 cons"}},

    // ==========================================
    // MEDIA
    // ==========================================
    images: [
      {
        url: {
          type: String,
          required: true},
        publicId: String,
        alt: String}],
    video: {
      url: String,
      publicId: String},

    // ==========================================
    // VERIFICATION & STATUS
    // ==========================================
    verified: {
      type: Boolean,
      default: false},
    approved: {
      type: Boolean,
      default: false},
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending"},

    // ==========================================
    // HELPFULNESS
    // ==========================================
    helpful: {
      count: {
        type: Number,
        default: 0,
        min: 0},
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"}]},
    notHelpful: {
      count: {
        type: Number,
        default: 0,
        min: 0},
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"}]},

    // ==========================================
    // REPORTING
    // ==========================================
    reported: {
      type: Boolean,
      default: false},
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"},
        reason: {
          type: String,
          enum: ["spam", "inappropriate", "offensive", "irrelevant", "other"]},
        description: String,
        timestamp: {
          type: Date,
          default: Date.now}}],

    // ==========================================
    // ADMIN RESPONSE
    // ==========================================
    adminResponse: {
      text: String,
      createdAt: Date,
      updatedAt: Date},

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
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ approved: 1, status: 1 });
reviewSchema.index({ verified: 1, approved: 1 });
reviewSchema.index({ helpful: -1 });

// Compound indexes
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ product: 1, verified: 1, approved: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
reviewSchema.virtual("isApproved").get(function () {
  return this.approved && this.status === "approved";
});

reviewSchema.virtual("isVerified").get(function () {
  return this.verified;
});

reviewSchema.virtual("helpfulnessScore").get(function () {
  const total = this.helpful.count + this.notHelpful.count;
  if (total === 0) return 0;
  return (this.helpful.count / total) * 100;
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
reviewSchema.pre("save", function (next) {
  this.updatedAt = new Date();

  // Auto-approve if user has purchased product
  if (this.order) {
    this.verified = true;
    this.approved = true;
    this.status = "approved";
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Mark as helpful
 */
reviewSchema.methods.markHelpful = async function (userId) {
  if (this.helpful.users.includes(userId)) {
    // Remove from helpful
    this.helpful.users = this.helpful.users.filter(
      (id) => id.toString() !== userId.toString(),
    );
    this.helpful.count = this.helpful.users.length;
  } else {
    // Add to helpful
    this.helpful.users.push(userId);
    this.helpful.count = this.helpful.users.length;

    // Remove from not helpful if exists
    this.notHelpful.users = this.notHelpful.users.filter(
      (id) => id.toString() !== userId.toString(),
    );
    this.notHelpful.count = this.notHelpful.users.length;
  }

  await this.save();
  return this;
};

/**
 * Mark as not helpful
 */
reviewSchema.methods.markNotHelpful = async function (userId) {
  if (this.notHelpful.users.includes(userId)) {
    // Remove from not helpful
    this.notHelpful.users = this.notHelpful.users.filter(
      (id) => id.toString() !== userId.toString(),
    );
    this.notHelpful.count = this.notHelpful.users.length;
  } else {
    // Add to not helpful
    this.notHelpful.users.push(userId);
    this.notHelpful.count = this.notHelpful.users.length;

    // Remove from helpful if exists
    this.helpful.users = this.helpful.users.filter(
      (id) => id.toString() !== userId.toString(),
    );
    this.helpful.count = this.helpful.users.length;
  }

  await this.save();
  return this;
};

/**
 * Approve review
 */
reviewSchema.methods.approve = async function (adminId) {
  this.approved = true;
  this.status = "approved";
  this.updatedAt = new Date();
  await this.save();

  // Update product ratings
  await this.updateProductRatings();

  return this;
};

/**
 * Reject review
 */
reviewSchema.methods.reject = async function (reason) {
  this.approved = false;
  this.status = "rejected";
  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Update product ratings
 */
reviewSchema.methods.updateProductRatings = async function () {
  const Product = mongoose.model("Product");
  const product = await Product.findById(this.product);

  if (!product) return;

  // Get all approved reviews for this product
  const reviews = await this.constructor.find({
    product: this.product,
    approved: true,
    status: "approved"});

  // Calculate new ratings
  const totalReviews = reviews.length;
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = totalReviews > 0 ? totalRating / totalReviews : 0;

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((review) => {
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  });

  // Update product
  product.ratings = {
    average: Math.round(average * 10) / 10,
    count: totalReviews,
    distribution};

  await product.save();
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get product reviews with pagination
 */
reviewSchema.statics.getProductReviews = async function (
  productId,
  options = {},
) {
  const {
    page = 1,
    limit = 10,
    rating = null,
    sort = { createdAt: -1 },
    includeUnapproved = false} = options;

  const query = {
    product: productId,
    ...(rating && { rating }),
    ...(!includeUnapproved && { approved: true, status: "approved" })};

  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    this.find(query)
      .populate("user", "name profilePicture")
      .sort(sort)
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)]);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1}};
};

/**
 * Get review statistics for a product
 */
reviewSchema.statics.getProductStats = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: {
        product: mongoose.Types.ObjectId(productId),
        approved: true,
        status: "approved"}},
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        average: { $avg: "$rating" },
        "1star": { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        "2star": { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        "3star": { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        "4star": { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        "5star": { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } }}}]);

  return (
    stats[0] || {
      total: 0,
      average: 0,
      "1star": 0,
      "2star": 0,
      "3star": 0,
      "4star": 0,
      "5star": 0}
  );
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Review", reviewSchema);


