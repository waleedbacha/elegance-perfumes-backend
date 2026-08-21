/**
 * Analytics Service
 * Advanced analytics and reporting
 */

const Analytics = require("../models/Analytics");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Review = require("../models/Review");
const logger = require("../middleware/logger");

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 300; // 5 minutes
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(period = "30d") {
    try {
      const startDate = this.getStartDate(period);
      const cacheKey = `dashboard:${period}`;

      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const [
        salesStats,
        orderStats,
        userStats,
        productStats,
        reviewStats,
        dailyMetrics,
      ] = await Promise.all([
        this.getSalesStats(startDate),
        this.getOrderStats(startDate),
        this.getUserStats(startDate),
        this.getProductStats(startDate),
        this.getReviewStats(startDate),
        this.getDailyMetrics(startDate),
      ]);

      const result = {
        period,
        summary: {
          sales: salesStats,
          orders: orderStats,
          users: userStats,
          products: productStats,
          reviews: reviewStats,
        },
        dailyMetrics,
        timestamp: new Date().toISOString(),
      };

      this.setToCache(cacheKey, result, this.cacheTTL);
      return result;
    } catch (error) {
      logger.error("Dashboard analytics failed", {
        period,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
            },
            totalRevenue: { $sum: "$total" },
            totalOrders: { $sum: 1 },
            averageOrderValue: { $avg: "$total" },
            totalItems: { $sum: { $size: "$items" } },
            totalQuantity: { $sum: { $sum: "$items.quantity" } },
          },
        },
        { $sort: { "_id.date": 1 } },
      ];

      const dailySales = await Order.aggregate(pipeline);

      // Get category breakdown
      const categorySales = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
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

      // Get brand breakdown
      const brandSales = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
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

      // Get payment method breakdown
      const paymentBreakdown = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      return {
        dailySales,
        categorySales,
        brandSales,
        paymentBreakdown,
        summary: {
          totalRevenue: dailySales.reduce((sum, d) => sum + d.totalRevenue, 0),
          totalOrders: dailySales.reduce((sum, d) => sum + d.totalOrders, 0),
          averageOrderValue:
            dailySales.reduce((sum, d) => sum + d.averageOrderValue, 0) /
            (dailySales.length || 1),
          totalItems: dailySales.reduce((sum, d) => sum + d.totalQuantity, 0),
        },
      };
    } catch (error) {
      logger.error("Sales analytics failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(startDate, endDate) {
    try {
      // User growth
      const userGrowth = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
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
            avgSpent: { $avg: "$totalSpent" },
            avgOrders: { $avg: "$orderCount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // New vs Returning
      const userSegments = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: "$user",
            firstOrder: { $min: "$createdAt" },
            lastOrder: { $max: "$createdAt" },
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$total" },
          },
        },
        {
          $project: {
            userType: {
              $cond: [
                { $eq: ["$orderCount", 1] },
                "new",
                { $cond: [{ $eq: ["$orderCount", 2] }, "returning", "loyal"] },
              ],
            },
            orderCount: 1,
            totalSpent: 1,
          },
        },
        {
          $group: {
            _id: "$userType",
            count: { $sum: 1 },
            avgSpent: { $avg: "$totalSpent" },
            avgOrders: { $avg: "$orderCount" },
          },
        },
      ]);

      // Active users (last 30 days)
      const activeUsers = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: "$user" } },
        { $count: "activeUsers" },
      ]);

      return {
        userGrowth,
        usersByTier,
        userSegments,
        activeUsers: activeUsers[0]?.activeUsers || 0,
        totalUsers: await User.countDocuments(),
        totalActiveUsers: await User.countDocuments({ status: "active" }),
        newUsers: await User.countDocuments({ createdAt: { $gte: startDate } }),
      };
    } catch (error) {
      logger.error("User analytics failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(startDate, endDate) {
    try {
      // Top products
      const topProducts = await Product.aggregate([
        {
          $match: {
            status: "active",
          },
        },
        {
          $lookup: {
            from: "orders",
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ["$$productId", "$items.product"] },
                      { $eq: ["$status", "delivered"] },
                      { $gte: ["$createdAt", startDate] },
                      { $lte: ["$createdAt", endDate] },
                    ],
                  },
                },
              },
              { $unwind: "$items" },
              {
                $match: {
                  $expr: { $eq: ["$items.product", "$$productId"] },
                },
              },
              {
                $group: {
                  _id: null,
                  totalSold: { $sum: "$items.quantity" },
                  totalRevenue: { $sum: "$items.total" },
                },
              },
            ],
            as: "salesData",
          },
        },
        {
          $project: {
            name: 1,
            brand: 1,
            category: 1,
            price: 1,
            totalStock: 1,
            "ratings.average": 1,
            "ratings.count": 1,
            purchasedCount: 1,
            views: 1,
            salesData: { $arrayElemAt: ["$salesData", 0] },
          },
        },
        {
          $project: {
            name: 1,
            brand: 1,
            category: 1,
            price: 1,
            totalStock: 1,
            rating: "$ratings.average",
            reviewCount: "$ratings.count",
            totalPurchased: "$purchasedCount",
            views: 1,
            revenue: "$salesData.totalRevenue",
            totalSold: "$salesData.totalSold",
            conversionRate: {
              $multiply: [
                {
                  $divide: ["$salesData.totalSold", { $ifNull: ["$views", 1] }],
                },
                100,
              ],
            },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 20 },
      ]);

      // Category performance
      const categoryPerformance = await Product.aggregate([
        {
          $match: {
            status: "active",
          },
        },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            avgPrice: { $avg: "$price" },
            totalStock: { $sum: "$totalStock" },
            avgRating: { $avg: "$ratings.average" },
            totalReviews: { $sum: "$ratings.count" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Brand performance
      const brandPerformance = await Product.aggregate([
        {
          $match: {
            status: "active",
          },
        },
        {
          $group: {
            _id: "$brand",
            count: { $sum: 1 },
            avgPrice: { $avg: "$price" },
            totalStock: { $sum: "$totalStock" },
            avgRating: { $avg: "$ratings.average" },
            totalReviews: { $sum: "$ratings.count" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return {
        topProducts,
        categoryPerformance,
        brandPerformance,
        totalProducts: await Product.countDocuments({ status: "active" }),
        outOfStock: await Product.countDocuments({
          totalStock: 0,
          status: "active",
        }),
        lowStock: await Product.countDocuments({
          totalStock: { $gt: 0, $lte: 5 },
          status: "active",
        }),
      };
    } catch (error) {
      logger.error("Product analytics failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get sales stats
   */
  async getSalesStats(startDate) {
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          averageOrder: { $avg: "$total" },
          maxOrder: { $max: "$total" },
          minOrder: { $min: "$total" },
        },
      },
    ]);

    const previousPeriod = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(
              startDate.getTime() - (Date.now() - startDate.getTime()),
            ),
            $lt: startDate,
          },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
    ]);

    const current = stats[0] || { revenue: 0, orders: 0, averageOrder: 0 };
    const previous = previousPeriod[0] || { revenue: 0, orders: 0 };

    return {
      revenue: current.revenue || 0,
      orders: current.orders || 0,
      averageOrder: current.averageOrder || 0,
      maxOrder: current.maxOrder || 0,
      minOrder: current.minOrder || 0,
      growth: {
        revenue:
          previous.revenue > 0
            ? ((current.revenue - previous.revenue) / previous.revenue) * 100
            : 0,
        orders:
          previous.orders > 0
            ? ((current.orders - previous.orders) / previous.orders) * 100
            : 0,
      },
    };
  }

  /**
   * Get order stats
   */
  async getOrderStats(startDate) {
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {};
    stats.forEach((stat) => {
      result[stat._id] = stat.count;
    });

    return {
      pending: result.pending || 0,
      confirmed: result.confirmed || 0,
      processing: result.processing || 0,
      packed: result.packed || 0,
      shipped: result.shipped || 0,
      delivered: result.delivered || 0,
      cancelled: result.cancelled || 0,
      total: stats.reduce((sum, s) => sum + s.count, 0),
    };
  }

  /**
   * Get user stats
   */
  async getUserStats(startDate) {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ status: "active" });
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });

    const tierStats = await User.aggregate([
      {
        $group: {
          _id: "$loyaltyTier",
          count: { $sum: 1 },
        },
      },
    ]);

    const tiers = {};
    tierStats.forEach((stat) => {
      tiers[stat._id] = stat.count;
    });

    return {
      total,
      active,
      newUsers,
      tiers,
    };
  }

  /**
   * Get product stats
   */
  async getProductStats(startDate) {
    const total = await Product.countDocuments({ status: "active" });
    const outOfStock = await Product.countDocuments({
      totalStock: 0,
      status: "active",
    });
    const lowStock = await Product.countDocuments({
      totalStock: { $gt: 0, $lte: 5 },
      status: "active",
    });

    const topRated = await Product.find({ status: "active" })
      .sort({ "ratings.average": -1 })
      .limit(5)
      .select("name brand ratings.average");

    const mostViewed = await Product.find({ status: "active" })
      .sort({ views: -1 })
      .limit(5)
      .select("name brand views");

    return {
      total,
      outOfStock,
      lowStock,
      topRated,
      mostViewed,
    };
  }

  /**
   * Get review stats
   */
  async getReviewStats(startDate) {
    const total = await Review.countDocuments({ approved: true });
    const pending = await Review.countDocuments({ approved: false });
    const newReviews = await Review.countDocuments({
      createdAt: { $gte: startDate },
      approved: true,
    });

    const avgRating = await Review.aggregate([
      { $match: { approved: true } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]);

    const ratingDistribution = await Review.aggregate([
      { $match: { approved: true } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      total,
      pending,
      newReviews,
      averageRating: avgRating[0]?.avg || 0,
      ratingDistribution,
    };
  }

  /**
   * Get daily metrics
   */
  async getDailyMetrics(startDate) {
    const metrics = await Analytics.aggregate([
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
          sessions: { $addToSet: "$sessionId" },
          users: { $addToSet: "$user" },
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
          sessions: { $size: "$sessions" },
          users: { $size: "$users" },
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
  }

  /**
   * Get start date for period
   */
  getStartDate(period) {
    const now = new Date();
    switch (period) {
      case "7d":
        return new Date(now.setDate(now.getDate() - 7));
      case "30d":
        return new Date(now.setDate(now.getDate() - 30));
      case "90d":
        return new Date(now.setDate(now.getDate() - 90));
      case "365d":
        return new Date(now.setDate(now.getDate() - 365));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  /**
   * Export report as CSV
   */
  async exportReport(reportType, startDate, endDate) {
    try {
      let data = [];

      switch (reportType) {
        case "sales":
          const salesData = await this.getSalesAnalytics(startDate, endDate);
          data = salesData.dailySales.map((d) => ({
            Date: d._id.date,
            Revenue: d.totalRevenue,
            Orders: d.totalOrders,
            "Avg Order": d.averageOrderValue,
            Items: d.totalQuantity,
          }));
          break;

        case "users":
          const userData = await this.getUserAnalytics(startDate, endDate);
          data = userData.userGrowth.map((d) => ({
            Date: d._id.date,
            "New Users": d.count,
          }));
          break;

        case "products":
          const productData = await this.getProductAnalytics(
            startDate,
            endDate,
          );
          data = productData.topProducts.map((p) => ({
            Name: p.name,
            Brand: p.brand,
            Category: p.category,
            Price: p.price,
            "Units Sold": p.totalSold || 0,
            Revenue: p.revenue || 0,
            Rating: p.rating || 0,
          }));
          break;

        default:
          throw new Error("Invalid report type");
      }

      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(","),
        ...data.map((row) => headers.map((h) => row[h]).join(",")),
      ].join("\n");

      return csv;
    } catch (error) {
      logger.error("Report export failed", {
        reportType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cache helper methods
   */
  getFromCache(key) {
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < this.cacheTTL * 1000) {
        return data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  setToCache(key, data, ttl = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
module.exports = new AnalyticsService();
