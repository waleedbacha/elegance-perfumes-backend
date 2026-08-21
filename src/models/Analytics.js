/**
 * Analytics Model
 * System analytics, tracking, and reporting
 */

const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    // ==========================================
    // ANALYTICS TYPE
    // ==========================================
    type: {
      type: String,
      enum: [
        "pageview",
        "product-view",
        "search",
        "add-to-cart",
        "remove-from-cart",
        "checkout",
        "order",
        "payment",
        "user-registration",
        "user-login",
        "user-logout",
        "banner-click",
        "coupon-use",
        "review",
        "share",
        "wishlist-add",
        "wishlist-remove",
        "click",
        "conversion",
      ],
      required: true,
    },

    // ==========================================
    // USER REFERENCE
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    sessionId: {
      type: String,
    },

    // ==========================================
    // REFERENCE TO OTHER MODELS
    // ==========================================
    reference: {
      model: {
        type: String,
        enum: [
          "Product",
          "Order",
          "Banner",
          "Coupon",
          "User",
          "Category",
          "Review",
        ],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },

    // ==========================================
    // EVENT DATA
    // ==========================================
    data: {
      // For pageview
      page: String,
      url: String,
      referrer: String,

      // For product-view
      productId: mongoose.Schema.Types.ObjectId,
      productName: String,
      productBrand: String,
      productCategory: String,

      // For search
      searchTerm: String,
      searchResults: Number,

      // For cart events
      productId: mongoose.Schema.Types.ObjectId,
      productName: String,
      quantity: Number,
      price: Number,

      // For order
      orderId: mongoose.Schema.Types.ObjectId,
      orderNumber: String,
      orderTotal: Number,
      paymentMethod: String,

      // For user events
      userType: String,
      registrationMethod: String,

      // For banner
      bannerId: mongoose.Schema.Types.ObjectId,
      bannerTitle: String,

      // For coupon
      couponCode: String,
      couponDiscount: Number,

      // For review
      reviewId: mongoose.Schema.Types.ObjectId,
      reviewRating: Number,

      // For share
      sharePlatform: String,

      // Generic
      value: Number,
      count: Number,
      duration: Number,
      metadata: mongoose.Schema.Types.Mixed,
    },

    // ==========================================
    // GEOGRAPHIC DATA
    // ==========================================
    location: {
      country: String,
      city: String,
      region: String,
      ipAddress: String,
      timezone: String,
    },

    // ==========================================
    // DEVICE DATA
    // ==========================================
    device: {
      type: {
        type: String,
        enum: ["desktop", "tablet", "mobile"],
      },
      os: String,
      browser: String,
      browserVersion: String,
      screenSize: String,
      userAgent: String,
    },

    // ==========================================
    // SOURCE DATA
    // ==========================================
    source: {
      type: String,
      enum: [
        "direct",
        "organic",
        "social",
        "email",
        "referral",
        "whatsapp",
        "admin",
        "website",
      ],
    },
    medium: {
      type: String,
      enum: ["web", "mobile", "email", "social", "search", "whatsapp"],
    },
    campaign: String,
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },

    // ==========================================
    // VALUE TRACKING
    // ==========================================
    monetaryValue: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // CONVERSION TRACKING
    // ==========================================
    isConversion: {
      type: Boolean,
      default: false,
    },
    conversionValue: {
      type: Number,
      default: 0,
    },
    conversionType: String,

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    eventDate: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
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
analyticsSchema.index({ type: 1, eventDate: -1 });
analyticsSchema.index({ user: 1, eventDate: -1 });
analyticsSchema.index({ sessionId: 1, eventDate: -1 });
analyticsSchema.index({ "reference.model": 1, "reference.id": 1 });
analyticsSchema.index({ eventDate: -1 });
analyticsSchema.index({ source: 1, eventDate: -1 });
analyticsSchema.index({ isConversion: 1, eventDate: -1 });

// Compound indexes for common queries
analyticsSchema.index({ type: 1, eventDate: -1, isConversion: 1 });
analyticsSchema.index({ "location.country": 1, eventDate: -1 });
analyticsSchema.index({ "device.type": 1, eventDate: -1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
analyticsSchema.virtual("date").get(function () {
  return this.eventDate.toISOString().split("T")[0];
});

analyticsSchema.virtual("hour").get(function () {
  return this.eventDate.getHours();
});

analyticsSchema.virtual("dayOfWeek").get(function () {
  return this.eventDate.getDay();
});

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Track event
 */
analyticsSchema.statics.track = async function (eventData) {
  const analytics = new this(eventData);
  await analytics.save();
  return analytics;
};

/**
 * Get pageview stats
 */
analyticsSchema.statics.getPageviewStats = async function (startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        type: "pageview",
        eventDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$data.page",
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: "$user" },
      },
    },
    {
      $project: {
        page: "$_id",
        views: "$count",
        uniqueVisitors: { $size: "$uniqueUsers" },
      },
    },
    { $sort: { views: -1 } },
  ]);

  return stats;
};

/**
 * Get conversion stats
 */
analyticsSchema.statics.getConversionStats = async function (
  startDate,
  endDate,
) {
  const stats = await this.aggregate([
    {
      $match: {
        isConversion: true,
        eventDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$conversionType",
        count: { $sum: 1 },
        totalValue: { $sum: "$conversionValue" },
        averageValue: { $avg: "$conversionValue" },
      },
    },
    {
      $project: {
        conversionType: "$_id",
        count: 1,
        totalValue: 1,
        averageValue: { $round: ["$averageValue", 2] },
      },
    },
  ]);

  return stats;
};

/**
 * Get user journey
 */
analyticsSchema.statics.getUserJourney = async function (userId, limit = 50) {
  const events = await this.find({ user: userId })
    .sort({ eventDate: 1 })
    .limit(limit)
    .select("type data eventDate source");

  return events;
};

/**
 * Get product performance
 */
analyticsSchema.statics.getProductPerformance = async function (
  startDate,
  endDate,
  limit = 10,
) {
  const performance = await this.aggregate([
    {
      $match: {
        "data.productId": { $exists: true },
        eventDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$data.productId",
        views: {
          $sum: { $cond: [{ $eq: ["$type", "product-view"] }, 1, 0] },
        },
        addToCarts: {
          $sum: { $cond: [{ $eq: ["$type", "add-to-cart"] }, 1, 0] },
        },
        conversions: {
          $sum: { $cond: [{ $eq: ["$type", "order"] }, 1, 0] },
        },
        revenue: {
          $sum: { $cond: [{ $eq: ["$type", "order"] }, "$data.orderTotal", 0] },
        },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: "$_id",
        productName: "$product.name",
        brand: "$product.brand",
        views: 1,
        addToCarts: 1,
        conversions: 1,
        revenue: 1,
        conversionRate: {
          $cond: [
            { $eq: ["$views", 0] },
            0,
            { $multiply: [{ $divide: ["$conversions", "$views"] }, 100] },
          ],
        },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
  ]);

  return performance;
};

/**
 * Get source performance
 */
analyticsSchema.statics.getSourcePerformance = async function (
  startDate,
  endDate,
) {
  const stats = await this.aggregate([
    {
      $match: {
        eventDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          source: "$source",
          medium: "$medium",
        },
        events: { $sum: 1 },
        conversions: {
          $sum: { $cond: [{ $eq: ["$isConversion", true] }, 1, 0] },
        },
        revenue: { $sum: "$conversionValue" },
      },
    },
    {
      $group: {
        _id: "$_id.source",
        totalEvents: { $sum: "$events" },
        totalConversions: { $sum: "$conversions" },
        totalRevenue: { $sum: "$revenue" },
        mediums: {
          $push: {
            medium: "$_id.medium",
            events: "$events",
            conversions: "$conversions",
            revenue: "$revenue",
          },
        },
      },
    },
    {
      $project: {
        source: "$_id",
        totalEvents: 1,
        totalConversions: 1,
        totalRevenue: 1,
        conversionRate: {
          $cond: [
            { $eq: ["$totalEvents", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$totalConversions", "$totalEvents"] },
                100,
              ],
            },
          ],
        },
        mediums: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return stats;
};

/**
 * Get daily metrics
 */
analyticsSchema.statics.getDailyMetrics = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await this.aggregate([
    {
      $match: {
        eventDate: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$eventDate" } },
        },
        pageviews: {
          $sum: { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] },
        },
        uniqueUsers: { $addToSet: "$user" },
        addToCarts: {
          $sum: { $cond: [{ $eq: ["$type", "add-to-cart"] }, 1, 0] },
        },
        conversions: {
          $sum: { $cond: [{ $eq: ["$isConversion", true] }, 1, 0] },
        },
        revenue: { $sum: "$conversionValue" },
      },
    },
    {
      $project: {
        date: "$_id.date",
        pageviews: 1,
        uniqueVisitors: { $size: "$uniqueUsers" },
        addToCarts: 1,
        conversions: 1,
        revenue: 1,
        conversionRate: {
          $cond: [
            { $eq: ["$pageviews", 0] },
            0,
            { $multiply: [{ $divide: ["$conversions", "$pageviews"] }, 100] },
          ],
        },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return metrics;
};

/**
 * Get real-time stats
 */
analyticsSchema.statics.getRealtimeStats = async function (minutes = 5) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        eventDate: { $gte: cutoff },
      },
    },
    {
      $group: {
        _id: null,
        activeUsers: { $addToSet: "$user" },
        pageviews: {
          $sum: { $cond: [{ $eq: ["$type", "pageview"] }, 1, 0] },
        },
        events: { $sum: 1 },
      },
    },
    {
      $project: {
        activeUsers: { $size: "$activeUsers" },
        pageviews: 1,
        events: 1,
      },
    },
  ]);

  return (
    stats[0] || {
      activeUsers: 0,
      pageviews: 0,
      events: 0,
    }
  );
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Analytics", analyticsSchema);
