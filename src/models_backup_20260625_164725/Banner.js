/**
 * Banner Model
 * Homepage and promotional banners
 */

const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      maxlength: [100, "Title must not exceed 100 characters"]},
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, "Subtitle must not exceed 200 characters"]},
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must not exceed 500 characters"]},

    // ==========================================
    // MEDIA
    // ==========================================
    image: {
      url: {
        type: String,
        required: true},
      publicId: String,
      alt: {
        type: String,
        required: true,
        trim: true},
      width: Number,
      height: Number,
      size: Number},
    mobileImage: {
      url: String,
      publicId: String,
      alt: String},
    video: {
      url: String,
      thumbnail: String},

    // ==========================================
    // LINK
    // ==========================================
    link: {
      url: {
        type: String,
        trim: true},
      openInNewTab: {
        type: Boolean,
        default: false},
      text: String},

    // ==========================================
    // POSITION & ORDER
    // ==========================================
    position: {
      type: String,
      enum: ["hero", "category", "promo", "sidebar", "footer", "popup"],
      required: true},
    order: {
      type: Number,
      default: 0},
    section: {
      type: String,
      enum: ["homepage", "shop", "category", "product", "checkout"],
      default: "homepage"},

    // ==========================================
    // VISIBILITY
    // ==========================================
    visibility: {
      devices: [
        {
          type: String,
          enum: ["desktop", "tablet", "mobile"],
          default: ["desktop", "tablet", "mobile"]}],
      userSegments: [
        {
          type: String,
          enum: ["new-users", "returning-users", "premium-users", "all"],
          default: ["all"]}],
      pages: [
        {
          type: String}],
      geolocation: {
        countries: [String],
        cities: [String],
        regions: [String]}},

    // ==========================================
    // SCHEDULING
    // ==========================================
    startDate: {
      type: Date,
      default: Date.now},
    endDate: {
      type: Date},
    scheduleType: {
      type: String,
      enum: ["always", "scheduled", "recurring"],
      default: "always"},
    recurring: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"]},
    recurringDays: [Number],

    // ==========================================
    // STATUS
    // ==========================================
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled", "expired"],
      default: "inactive"},

    // ==========================================
    // STYLING
    // ==========================================
    style: {
      backgroundColor: String,
      textColor: String,
      buttonColor: String,
      buttonTextColor: String,
      alignment: {
        type: String,
        enum: ["left", "center", "right"],
        default: "center"},
      overlay: {
        enabled: {
          type: Boolean,
          default: false},
        color: String,
        opacity: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.5}},
      customCSS: String},

    // ==========================================
    // TARGETING
    // ==========================================
    targeting: {
      categories: [String],
      brands: [String],
      products: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product"}],
      minPrice: Number,
      maxPrice: Number},

    // ==========================================
    // ANALYTICS
    // ==========================================
    analytics: {
      impressions: {
        type: Number,
        default: 0,
        min: 0},
      clicks: {
        type: Number,
        default: 0,
        min: 0},
      conversions: {
        type: Number,
        default: 0,
        min: 0},
      conversionValue: {
        type: Number,
        default: 0,
        min: 0},
      clickThroughRate: {
        type: Number,
        default: 0},
      dailyStats: [
        {
          date: Date,
          impressions: Number,
          clicks: Number,
          conversions: Number}]},

    // ==========================================
    // CREATED BY
    // ==========================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"},
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"}},
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }},
);

// ==========================================
// INDEXES FOR PERFORMANCE
// ==========================================
bannerSchema.index({ position: 1, status: 1 });
bannerSchema.index({ order: 1, status: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ status: 1, position: 1, order: 1 });

// Compound indexes for common queries
bannerSchema.index({ status: 1, startDate: 1, endDate: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
bannerSchema.virtual("isActive").get(function () {
  if (this.status !== "active") return false;

  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;

  return true;
});

bannerSchema.virtual("isScheduled").get(function () {
  if (this.status !== "scheduled") return false;
  return new Date() < this.startDate;
});

bannerSchema.virtual("isExpired").get(function () {
  if (!this.endDate) return false;
  return new Date() > this.endDate;
});

bannerSchema.virtual("ctr").get(function () {
  if (this.analytics.impressions === 0) return 0;
  return (this.analytics.clicks / this.analytics.impressions) * 100;
});

bannerSchema.virtual("conversionRate").get(function () {
  if (this.analytics.clicks === 0) return 0;
  return (this.analytics.conversions / this.analytics.clicks) * 100;
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
bannerSchema.pre("save", function (next) {
  // Update status based on dates
  const now = new Date();

  if (this.status === "active") {
    if (this.startDate && now < this.startDate) {
      this.status = "scheduled";
    }
    if (this.endDate && now > this.endDate) {
      this.status = "expired";
    }
  }

  if (this.status === "scheduled") {
    if (this.startDate && now >= this.startDate) {
      this.status = "active";
    }
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Record impression
 */
bannerSchema.methods.recordImpression = async function () {
  this.analytics.impressions += 1;

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyStat = this.analytics.dailyStats.find(
    (stat) => stat.date.toDateString() === today.toDateString(),
  );

  if (dailyStat) {
    dailyStat.impressions += 1;
  } else {
    this.analytics.dailyStats.push({
      date: today,
      impressions: 1,
      clicks: 0,
      conversions: 0});
  }

  await this.save();
  return this;
};

/**
 * Record click
 */
bannerSchema.methods.recordClick = async function () {
  this.analytics.clicks += 1;

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyStat = this.analytics.dailyStats.find(
    (stat) => stat.date.toDateString() === today.toDateString(),
  );

  if (dailyStat) {
    dailyStat.clicks += 1;
  } else {
    this.analytics.dailyStats.push({
      date: today,
      impressions: 0,
      clicks: 1,
      conversions: 0});
  }

  await this.save();
  return this;
};

/**
 * Record conversion
 */
bannerSchema.methods.recordConversion = async function (value = 0) {
  this.analytics.conversions += 1;
  this.analytics.conversionValue += value;

  // Update daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyStat = this.analytics.dailyStats.find(
    (stat) => stat.date.toDateString() === today.toDateString(),
  );

  if (dailyStat) {
    dailyStat.conversions += 1;
  } else {
    this.analytics.dailyStats.push({
      date: today,
      impressions: 0,
      clicks: 0,
      conversions: 1});
  }

  // Update click through rate
  if (this.analytics.impressions > 0) {
    this.analytics.clickThroughRate =
      (this.analytics.clicks / this.analytics.impressions) * 100;
  }

  await this.save();
  return this;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get active banners for position
 */
bannerSchema.statics.getActiveBanners = async function (
  position = null,
  limit = null,
) {
  const now = new Date();

  const query = {
    status: "active",
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }]};

  if (position) {
    query.position = position;
  }

  let queryBuilder = this.find(query).sort({ order: 1 });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  return queryBuilder;
};

/**
 * Get banners for specific section
 */
bannerSchema.statics.getBannersForSection = async function (
  section,
  position = null,
  limit = null,
) {
  const now = new Date();

  const query = {
    status: "active",
    section: section,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }]};

  if (position) {
    query.position = position;
  }

  let queryBuilder = this.find(query).sort({ order: 1 });

  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }

  return queryBuilder;
};

/**
 * Get banner analytics summary
 */
bannerSchema.statics.getAnalyticsSummary = async function (
  startDate = null,
  endDate = null,
) {
  const match = {};

  if (startDate) {
    match.createdAt = { $gte: startDate };
  }
  if (endDate) {
    match.createdAt = { ...match.createdAt, $lte: endDate };
  }

  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$position",
        count: { $sum: 1 },
        totalImpressions: { $sum: "$analytics.impressions" },
        totalClicks: { $sum: "$analytics.clicks" },
        totalConversions: { $sum: "$analytics.conversions" },
        totalValue: { $sum: "$analytics.conversionValue" },
        avgCTR: { $avg: "$analytics.clickThroughRate" }}},
    {
      $project: {
        position: "$_id",
        count: 1,
        totalImpressions: 1,
        totalClicks: 1,
        totalConversions: 1,
        totalValue: 1,
        avgCTR: { $round: ["$avgCTR", 2] },
        conversionRate: {
          $cond: [
            { $eq: ["$totalClicks", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$totalConversions", "$totalClicks"] },
                100]}]}}},
    { $sort: { totalImpressions: -1 } }]);

  return summary;
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Banner", bannerSchema);


