/**
 * Inventory Service
 * Advanced inventory management
 */

const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const Order = require("../models/Order");
const NotificationService = require("./notificationService");
const logger = require("../middleware/logger");

class InventoryService {
  constructor() {
    this.lowStockThreshold = 5;
    this.cache = new Map();
    this.cacheTTL = 60; // 1 minute
  }

  /**
   * Initialize inventory for new product
   */
  async initializeInventory(productId, quantity = 0) {
    try {
      const inventory = new Inventory({
        product: productId,
        quantity: parseInt(quantity) || 0,
        lowStockThreshold: this.lowStockThreshold,
        history: [
          {
            type: "restock",
            quantity: parseInt(quantity) || 0,
            previousQuantity: 0,
            newQuantity: parseInt(quantity) || 0,
            reason: "Initial stock setup",
            date: new Date(),
          },
        ],
      });

      await inventory.save();

      logger.info("Inventory initialized", {
        productId,
        quantity,
      });

      return inventory;
    } catch (error) {
      logger.error("Inventory initialization failed", {
        productId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process order - deduct inventory
   */
  async processOrder(order) {
    try {
      const results = [];

      for (const item of order.items) {
        const inventory = await Inventory.findOne({ product: item.product });
        if (!inventory) {
          throw new Error(`Inventory not found for product ${item.product}`);
        }

        // Check stock
        if (inventory.availableQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.product}. Available: ${inventory.availableQuantity}, Required: ${item.quantity}`,
          );
        }

        // Deduct stock
        await inventory.deductStock(
          item.quantity,
          `Order #${order.orderNumber}`,
          { id: order._id, type: "order" },
        );

        // Update product stock
        await Product.findByIdAndUpdate(item.product, {
          totalStock: inventory.quantity,
        });

        results.push({
          productId: item.product,
          previousStock: inventory.quantity + item.quantity,
          currentStock: inventory.quantity,
          deducted: item.quantity,
        });

        // Check for low stock alert
        if (inventory.isLowStock) {
          await this.sendLowStockAlert(inventory);
        }
      }

      logger.info("Order processed in inventory", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        items: results,
      });

      return results;
    } catch (error) {
      logger.error("Order processing failed in inventory", {
        orderId: order._id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cancel order - restore inventory
   */
  async cancelOrder(order) {
    try {
      const results = [];

      for (const item of order.items) {
        const inventory = await Inventory.findOne({ product: item.product });
        if (!inventory) continue;

        // Restore stock
        await inventory.addStock(
          item.quantity,
          `Order cancelled: ${order.orderNumber}`,
          null,
          `Restored from cancelled order #${order.orderNumber}`,
        );

        // Update product stock
        await Product.findByIdAndUpdate(item.product, {
          totalStock: inventory.quantity,
        });

        results.push({
          productId: item.product,
          previousStock: inventory.quantity - item.quantity,
          currentStock: inventory.quantity,
          restored: item.quantity,
        });
      }

      logger.info("Order cancellation processed in inventory", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        items: results,
      });

      return results;
    } catch (error) {
      logger.error("Order cancellation failed in inventory", {
        orderId: order._id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reserve stock for order
   */
  async reserveStock(productId, quantity) {
    try {
      const inventory = await Inventory.findOne({ product: productId });
      if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
      }

      await inventory.reserveStock(quantity);

      logger.info("Stock reserved", {
        productId,
        quantity,
        available: inventory.availableQuantity,
      });

      return inventory;
    } catch (error) {
      logger.error("Stock reservation failed", {
        productId,
        quantity,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Release reserved stock
   */
  async releaseReservedStock(productId, quantity, reason = "") {
    try {
      const inventory = await Inventory.findOne({ product: productId });
      if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
      }

      await inventory.releaseReservedStock(quantity, reason);

      logger.info("Reserved stock released", {
        productId,
        quantity,
        reason,
      });

      return inventory;
    } catch (error) {
      logger.error("Reserved stock release failed", {
        productId,
        quantity,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Bulk stock update
   */
  async bulkUpdateStock(updates) {
    try {
      const results = {
        success: [],
        failed: [],
      };

      for (const update of updates) {
        try {
          const { productId, quantity, reason = "Bulk update" } = update;

          const inventory = await Inventory.findOne({ product: productId });
          if (!inventory) {
            results.failed.push({
              productId,
              error: "Inventory not found",
            });
            continue;
          }

          const previousQuantity = inventory.quantity;
          await inventory.adjustStock(parseInt(quantity), reason, null);

          // Update product stock
          await Product.findByIdAndUpdate(productId, {
            totalStock: inventory.quantity,
          });

          results.success.push({
            productId,
            previousQuantity,
            newQuantity: inventory.quantity,
          });

          // Check for low stock alert
          if (inventory.isLowStock) {
            await this.sendLowStockAlert(inventory);
          }
        } catch (error) {
          results.failed.push({
            productId: update.productId,
            error: error.message,
          });
        }
      }

      logger.info("Bulk stock update completed", {
        success: results.success.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      logger.error("Bulk stock update failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get stock alerts
   */
  async getStockAlerts() {
    try {
      const alerts = [];

      // Low stock products
      const lowStock = await Inventory.getLowStock();
      lowStock.forEach((item) => {
        alerts.push({
          type: "low-stock",
          productId: item.product._id,
          productName: item.product.name,
          brand: item.product.brand,
          currentStock: item.availableQuantity,
          threshold: item.lowStockThreshold,
          severity: "warning",
        });
      });

      // Out of stock products
      const outOfStock = await Inventory.getOutOfStock();
      outOfStock.forEach((item) => {
        alerts.push({
          type: "out-of-stock",
          productId: item.product._id,
          productName: item.product.name,
          brand: item.product.brand,
          currentStock: 0,
          severity: "critical",
        });
      });

      return alerts;
    } catch (error) {
      logger.error("Stock alerts retrieval failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(inventory) {
    try {
      const product = await Product.findById(inventory.product).select(
        "name brand images",
      );

      if (!product) return;

      // Check if alert already sent recently
      const recentAlert = inventory.alerts.find(
        (a) =>
          a.type === "low-stock" &&
          new Date() - new Date(a.createdAt) < 24 * 60 * 60 * 1000,
      );

      if (recentAlert) return;

      // Add alert to inventory
      inventory.alerts.push({
        type: "low-stock",
        message: `Product "${product.name}" is low on stock. Current: ${inventory.availableQuantity}`,
      });
      await inventory.save();

      // Send notification to admins
      await NotificationService.sendAdminAlert(
        `⚠️ Low Stock Alert: ${product.name}`,
        `Product "${product.name}" (${product.brand}) is running low on stock. Only ${inventory.availableQuantity} units remaining. Please restock soon.`,
        {
          productId: product._id,
          productName: product.name,
          brand: product.brand,
          currentStock: inventory.availableQuantity,
          threshold: inventory.lowStockThreshold,
          image: product.images?.[0]?.url,
        },
      );

      logger.info("Low stock alert sent", {
        productId: product._id,
        productName: product.name,
        currentStock: inventory.availableQuantity,
      });
    } catch (error) {
      logger.error("Low stock alert sending failed", {
        error: error.message,
      });
    }
  }

  /**
   * Get inventory forecast
   */
  async getInventoryForecast(productId, days = 30) {
    try {
      const inventory = await Inventory.findOne({ product: productId });
      if (!inventory) {
        throw new Error(`Inventory not found for product ${productId}`);
      }

      // Get historical sales data
      const orders = await Order.find({
        "items.product": productId,
        status: "delivered",
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }).select("items createdAt");

      // Calculate daily average sales
      let totalSold = 0;
      orders.forEach((order) => {
        const item = order.items.find(
          (i) => i.product.toString() === productId.toString(),
        );
        if (item) totalSold += item.quantity;
      });

      const daysWithData = Math.min(orders.length, 30) || 1;
      const averageDailySales = totalSold / daysWithData;

      // Calculate days until out of stock
      const daysUntilOutOfStock =
        inventory.availableQuantity / (averageDailySales || 1);

      // Projected stock levels
      const projection = [];
      let currentStock = inventory.availableQuantity;

      for (let i = 1; i <= days; i++) {
        currentStock -= averageDailySales;
        projection.push({
          day: i,
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          projectedStock: Math.max(0, Math.round(currentStock * 10) / 10),
          isOutOfStock: currentStock <= 0,
        });
      }

      // Reorder recommendations
      const reorderPoint = averageDailySales * inventory.lowStockThreshold;
      const needsReorder = inventory.availableQuantity <= reorderPoint;

      return {
        productId,
        productName: inventory.product?.name || "Unknown",
        currentStock: inventory.availableQuantity,
        reservedStock: inventory.reservedQuantity,
        averageDailySales: Math.round(averageDailySales * 10) / 10,
        daysUntilOutOfStock: Math.max(
          0,
          Math.round(daysUntilOutOfStock * 10) / 10,
        ),
        reorderPoint: Math.round(reorderPoint * 10) / 10,
        needsReorder,
        projection,
        recommendations: {
          reorderQuantity: Math.ceil(averageDailySales * 30), // 30 days supply
          priority:
            daysUntilOutOfStock < 7
              ? "high"
              : daysUntilOutOfStock < 14
                ? "medium"
                : "low",
        },
      };
    } catch (error) {
      logger.error("Inventory forecast failed", {
        productId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary() {
    try {
      const summary = await Inventory.getSummary();

      // Add additional insights
      const lowStockItems = await Inventory.countDocuments({
        $expr: {
          $and: [
            { $gt: ["$availableQuantity", 0] },
            { $lte: ["$availableQuantity", "$lowStockThreshold"] },
          ],
        },
      });

      const highValueItems = await Inventory.aggregate([
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productData",
          },
        },
        { $unwind: "$productData" },
        {
          $project: {
            value: { $multiply: ["$quantity", "$productData.price"] },
          },
        },
        { $sort: { value: -1 } },
        { $limit: 5 },
      ]);

      return {
        ...summary,
        lowStockItems,
        topValueItems: highValueItems,
        overallHealth: this.calculateInventoryHealth(summary),
      };
    } catch (error) {
      logger.error("Inventory summary failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate inventory health score
   */
  calculateInventoryHealth(summary) {
    let score = 0;
    const total = summary.totalProducts || 1;

    // Stock availability (30%)
    const inStockRatio = summary.inStock / total;
    score += inStockRatio * 30;

    // Low stock ratio (20%)
    const lowStockRatio = summary.lowStock / total;
    score += (1 - lowStockRatio) * 20;

    // Out of stock ratio (20%)
    const outOfStockRatio = summary.outOfStock / total;
    score += (1 - outOfStockRatio) * 20;

    // Stock value (15%)
    const maxValue = 1000000; // 1 million PKR benchmark
    const valueRatio = Math.min(summary.totalValue / maxValue, 1);
    score += valueRatio * 15;

    // Reserve ratio (15%)
    const reserveRatio = summary.totalReserved / (summary.totalStock || 1);
    score += (1 - Math.min(reserveRatio, 0.5)) * 15;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Auto-restock recommendations
   */
  async getRestockRecommendations() {
    try {
      const lowStockItems = await Inventory.getLowStock();
      const recommendations = [];

      for (const item of lowStockItems) {
        const forecast = await this.getInventoryForecast(item.product._id, 30);

        recommendations.push({
          productId: item.product._id,
          productName: item.product.name,
          brand: item.product.brand,
          currentStock: item.availableQuantity,
          threshold: item.lowStockThreshold,
          recommendedQuantity: forecast.recommendations.reorderQuantity,
          priority: forecast.recommendations.priority,
          estimatedCost:
            forecast.recommendations.reorderQuantity * (item.costPerUnit || 0),
          supplier: item.suppliers?.[0] || null,
        });
      }

      recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      return recommendations;
    } catch (error) {
      logger.error("Restock recommendations failed", {
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

  setToCache(key, data, ttl = 60) {
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
module.exports = new InventoryService();
