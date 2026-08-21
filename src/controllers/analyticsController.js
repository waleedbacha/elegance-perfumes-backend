/**
 * Analytics Controller
 * System analytics and reporting
 */

const { AppError } = require("../middleware/errorHandler");
const Analytics = require("../models/Analytics");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { MESSAGES } = require("../config/constants");

/**
 * Track event (public)
 */
exports.trackEvent = async (req, res, next) => {
  try {
    const { type, data, reference, source, medium, campaign, utm } = req.body;

    if (!type) {
      throw new AppError("Event type is required", 400, "MISSING_TYPE");
    }

    const eventData = {
      type,
      user: req.user?.id || null,
      sessionId: req.sessionId,
      data: data || {},
      reference: reference || {},
      source: source || "direct",
      medium: medium || "web",
      campaign: campaign || null,
      utm: utm || {},
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    await Analytics.track(eventData);

    res.status(201).json({
      success: true,
      message: "Event tracked successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ANALYTICS CONTROLLERS
// ==========================================

/**
 * Get dashboard stats (Admin)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Get today's stats
    const todayStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
    ]);

    // Get total stats
    const [
      totalOrders,
      totalRevenue,
      totalProducts,
      totalUsers,
      pendingOrders,
      lowStock,
    ] = await Promise.all([
      Order.countDocuments({ status: { $ne: "cancelled" } }),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Product.countDocuments({ status: "active" }),
      User.countDocuments({ status: "active" }),
      Order.countDocuments({ status: "pending" }),
      Product.countDocuments({
        totalStock: { $gt: 0, $lte: 5 },
        status: "active",
      }),
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    // Get top products
    const topProducts = await Product.find()
      .sort({ purchasedCount: -1 })
      .limit(10)
      .select("name brand price images purchasedCount totalStock");

    res.status(200).json({
      success: true,
      data: {
        today: {
          orders: todayStats[0]?.orders || 0,
          revenue: todayStats[0]?.revenue || 0,
        },
        total: {
          orders: totalOrders,
          revenue: totalRevenue[0]?.total || 0,
          products: totalProducts,
          users: totalUsers,
          pendingOrders,
          lowStock,
        },
        recentOrders,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get sales analytics (Admin)
 */
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "365d":
        startDate.setDate(startDate.getDate() - 365);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Daily sales
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$total" },
          average: { $avg: "$total" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Sales by category
    const categorySales = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.category",
          revenue: { $sum: "$items.total" },
          orders: { $sum: 1 },
          items: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Sales by brand
    const brandSales = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.brand",
          revenue: { $sum: "$items.total" },
          orders: { $sum: 1 },
          items: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        dailySales,
        categorySales,
        brandSales,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user analytics (Admin)
 */
exports.getUserAnalytics = async (req, res, next) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Daily user registrations
    const dailyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // User by tier
    const usersByTier = await User.aggregate([
      {
        $group: {
          _id: "$loyaltyTier",
          count: { $sum: 1 },
        },
      },
    ]);

    // New vs returning
    const userStats = await User.aggregate([
      {
        $facet: {
          total: [{ $count: "total" }],
          active: [{ $match: { status: "active" } }, { $count: "active" }],
          newUsers: [
            { $match: { createdAt: { $gte: startDate } } },
            { $count: "new" },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        dailyRegistrations,
        usersByTier,
        stats: {
          total: userStats[0]?.total[0]?.total || 0,
          active: userStats[0]?.active[0]?.active || 0,
          new: userStats[0]?.newUsers[0]?.new || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product analytics (Admin)
 */
exports.getProductAnalytics = async (req, res, next) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Product performance
    const productPerformance = await Analytics.getProductPerformance(
      startDate,
      new Date(),
      20,
    );

    // Category performance
    const categoryPerformance = await Order.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          createdAt: { $gte: startDate },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.category",
          revenue: { $sum: "$items.total" },
          orders: { $sum: 1 },
          items: { $sum: "$items.quantity" },
          averagePrice: { $avg: "$items.price" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Brand performance
    const brandPerformance = await Order.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          createdAt: { $gte: startDate },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData",
        },
      },
      { $unwind: "$productData" },
      {
        $group: {
          _id: "$productData.brand",
          revenue: { $sum: "$items.total" },
          orders: { $sum: 1 },
          items: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        productPerformance,
        categoryPerformance,
        brandPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get real-time analytics (Admin)
 */
exports.getRealtimeStats = async (req, res, next) => {
  try {
    const { minutes = 5 } = req.query;

    const stats = await Analytics.getRealtimeStats(parseInt(minutes));

    // Get recent events
    const recentEvents = await Analytics.find()
      .sort({ eventDate: -1 })
      .limit(20)
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      data: {
        realtime: stats,
        recentEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pageview analytics (Admin)
 */
exports.getPageviewAnalytics = async (req, res, next) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const pageviews = await Analytics.getPageviewStats(startDate, new Date());

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        pageviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conversion analytics (Admin)
 */
exports.getConversionAnalytics = async (req, res, next) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const conversions = await Analytics.getConversionStats(
      startDate,
      new Date(),
    );

    // Get daily metrics
    const dailyMetrics = await Analytics.getDailyMetrics(
      parseInt(period.replace("d", "")),
    );

    // Get source performance
    const sourcePerformance = await Analytics.getSourcePerformance(
      startDate,
      new Date(),
    );

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        conversions,
        dailyMetrics,
        sourcePerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export analytics report (Admin)
 */
exports.exportReport = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;

    if (!type || !startDate || !endDate) {
      throw new AppError(
        "Type, start date, and end date are required",
        400,
        "MISSING_FIELDS",
      );
    }

    // This would generate and return a CSV/Excel report
    // Implementation depends on reporting requirements

    res.status(200).json({
      success: true,
      message: "Report export not implemented yet",
    });
  } catch (error) {
    next(error);
  }
};
