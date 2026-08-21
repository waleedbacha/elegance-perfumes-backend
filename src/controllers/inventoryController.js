/**
 * Inventory Controller
 * Inventory management
 */

const { AppError } = require("../middleware/errorHandler");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const { MESSAGES } = require("../config/constants");

/**
 * Get inventory for a product
 */
exports.getInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventory = await Inventory.findOne({ product: productId }).populate(
      "product",
      "name brand price images",
    );

    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { inventory },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all inventory (Admin)
 */
exports.getAllInventory = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "quantity",
      sortOrder = "desc",
      minStock,
      maxStock,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (minStock !== undefined) query.quantity = { $gte: parseInt(minStock) };
    if (maxStock !== undefined) {
      query.quantity = { ...query.quantity, $lte: parseInt(maxStock) };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let inventoryQuery = Inventory.find(query)
      .populate("product", "name brand price images status")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    if (search) {
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const productIds = products.map((p) => p._id);
      inventoryQuery = inventoryQuery.where("product").in(productIds);
    }

    const [inventory, total] = await Promise.all([
      inventoryQuery,
      Inventory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update inventory (Admin)
 */
exports.updateInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, lowStockThreshold, locations, suppliers } = req.body;

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    if (quantity !== undefined) {
      const newQuantity = parseInt(quantity);
      const currentQuantity = inventory.quantity;
      const difference = newQuantity - currentQuantity;

      if (difference > 0) {
        // Add stock
        await inventory.addStock(
          difference,
          "Manual update (increase)",
          req.user.id,
        );
      } else if (difference < 0) {
        // Deduct stock
        await inventory.deductStock(
          Math.abs(difference),
          "Manual update (decrease)",
          null,
          req.user.id,
        );
      }
      // If difference is 0, do nothing
    }

    if (lowStockThreshold !== undefined) {
      inventory.lowStockThreshold = parseInt(lowStockThreshold);
    }

    if (locations) {
      inventory.locations = locations;
    }

    if (suppliers) {
      inventory.suppliers = suppliers;
    }

    await inventory.save();

    // Update product stock
    await Product.findByIdAndUpdate(productId, {
      totalStock: inventory.quantity,
    });

    // Check for low stock alert
    if (
      inventory.isLowStock &&
      !inventory.alerts.some((a) => a.type === "low-stock" && !a.isRead)
    ) {
      inventory.alerts.push({
        type: "low-stock",
        message: `Product ${inventory.product} is low on stock. Current: ${inventory.availableQuantity}`,
      });
      await inventory.save();

      // Create notification for admin
      await Notification.create({
        user: req.user.id,
        type: "stock",
        subtype: "low-stock",
        title: "Low Stock Alert",
        message: `Product ${inventory.product.name} is low on stock. Only ${inventory.availableQuantity} left.`,
        data: {
          productId: inventory.product._id,
          currentStock: inventory.availableQuantity,
          threshold: inventory.lowStockThreshold,
        },
        priority: "high",
      });
    }

    res.status(200).json({
      success: true,
      data: { inventory },
      message: "Inventory updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add stock (Admin)
 */
exports.addStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, reason, notes } = req.body;

    if (!quantity || parseInt(quantity) <= 0) {
      throw new AppError("Valid quantity is required", 400, "INVALID_QUANTITY");
    }

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    await inventory.addStock(
      parseInt(quantity),
      reason || "Restock",
      req.user.id,
      notes,
    );

    // Update product stock
    await Product.findByIdAndUpdate(productId, {
      totalStock: inventory.quantity,
    });

    res.status(200).json({
      success: true,
      data: { inventory },
      message: `Added ${quantity} units to stock`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deduct stock (Admin)
 */
exports.deductStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, reason } = req.body;

    if (!quantity || parseInt(quantity) <= 0) {
      throw new AppError("Valid quantity is required", 400, "INVALID_QUANTITY");
    }

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    await inventory.deductStock(
      parseInt(quantity),
      reason || "Stock deduction",
      null,
      req.user.id,
    );

    // Update product stock
    await Product.findByIdAndUpdate(productId, {
      totalStock: inventory.quantity,
    });

    res.status(200).json({
      success: true,
      data: { inventory },
      message: `Deducted ${quantity} units from stock`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reserve stock (Admin)
 */
exports.reserveStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || parseInt(quantity) <= 0) {
      throw new AppError("Valid quantity is required", 400, "INVALID_QUANTITY");
    }

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    await inventory.reserveStock(parseInt(quantity));

    res.status(200).json({
      success: true,
      data: { inventory },
      message: `Reserved ${quantity} units`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Release reserved stock (Admin)
 */
exports.releaseReservedStock = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity, reason } = req.body;

    if (!quantity || parseInt(quantity) <= 0) {
      throw new AppError("Valid quantity is required", 400, "INVALID_QUANTITY");
    }

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    await inventory.releaseReservedStock(
      parseInt(quantity),
      reason || "Released",
    );

    res.status(200).json({
      success: true,
      data: { inventory },
      message: `Released ${quantity} reserved units`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock products (Admin)
 */
exports.getLowStock = async (req, res, next) => {
  try {
    const { threshold, page = 1, limit = 20 } = req.query;

    const query = {
      $and: [
        { availableQuantity: { $gt: 0 } },
        { availableQuantity: { $ne: null } },
        {
          $expr: {
            $lte: [
              "$availableQuantity",
              {
                $ifNull: [
                  threshold ? parseInt(threshold) : null,
                  "$lowStockThreshold",
                ],
              },
            ],
          },
        },
      ],
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate("product", "name brand price images status")
        .sort({ availableQuantity: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Inventory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get out of stock products (Admin)
 */
exports.getOutOfStock = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      $or: [
        { availableQuantity: { $lte: 0 } },
        { availableQuantity: { $exists: false } },
        { availableQuantity: null },
      ],
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate("product", "name brand price images status")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Inventory.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory summary (Admin)
 */
exports.getInventorySummary = async (req, res, next) => {
  try {
    // ✅ FIX: Count from Product collection, not Inventory
    const Product = require("../models/Product");
    const totalProducts = await Product.countDocuments();

    // ✅ OUT OF STOCK: availableQuantity <= 0 OR availableQuantity is null/undefined
    const outOfStockCount = await Inventory.countDocuments({
      $or: [
        { availableQuantity: { $lte: 0 } },
        { availableQuantity: { $exists: false } },
        { availableQuantity: null },
      ],
    });

    // ✅ LOW STOCK: availableQuantity > 0 AND availableQuantity <= lowStockThreshold
    const lowStockCount = await Inventory.countDocuments({
      $and: [
        { availableQuantity: { $gt: 0 } },
        { availableQuantity: { $ne: null } },
        {
          $expr: {
            $lte: ["$availableQuantity", "$lowStockThreshold"],
          },
        },
      ],
    });

    // ✅ IN STOCK: availableQuantity > lowStockThreshold
    const inStockCount = await Inventory.countDocuments({
      $and: [
        { availableQuantity: { $gt: 0 } },
        { availableQuantity: { $ne: null } },
        {
          $expr: {
            $gt: ["$availableQuantity", "$lowStockThreshold"],
          },
        },
      ],
    });

    // Get total stock quantity
    const totalStockResult = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);
    const totalStock = totalStockResult[0]?.total || 0;

    // Get total available quantity
    const totalAvailableResult = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: "$availableQuantity" } } },
    ]);
    const totalAvailable = totalAvailableResult[0]?.total || 0;

    // Get total reserved quantity
    const totalReservedResult = await Inventory.aggregate([
      { $group: { _id: null, total: { $sum: "$reservedQuantity" } } },
    ]);
    const totalReserved = totalReservedResult[0]?.total || 0;

    // ✅ Log for debugging
    console.log("📊 Inventory Summary:", {
      totalProducts,
      outOfStockCount,
      lowStockCount,
      inStockCount,
      totalStock,
      totalAvailable,
      totalReserved,
    });

    const summary = {
      totalProducts,
      totalStock,
      totalAvailable,
      totalReserved,
      inStock: inStockCount,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      discontinued: 0,
      totalValue: 0,
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("❌ Error getting inventory summary:", error);
    next(error);
  }
};

/**
 * Get inventory report (Admin)
 */
exports.getInventoryReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError(
        "Start date and end date are required",
        400,
        "MISSING_DATES",
      );
    }

    const report = await Inventory.getReport(
      new Date(startDate),
      new Date(endDate),
    );

    res.status(200).json({
      success: true,
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory history (Admin)
 */
exports.getInventoryHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) {
      throw new AppError("Inventory not found", 404, "INVENTORY_NOT_FOUND");
    }

    const history = inventory.history
      .sort((a, b) => b.date - a.date)
      .slice(
        (parseInt(page) - 1) * parseInt(limit),
        parseInt(page) * parseInt(limit),
      );

    res.status(200).json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: inventory.history.length,
          pages: Math.ceil(inventory.history.length / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update inventory (Admin)
 */
exports.bulkUpdateInventory = async (req, res, next) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      throw new AppError("Updates array is required", 400, "MISSING_UPDATES");
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const update of updates) {
      try {
        const { productId, quantity, lowStockThreshold } = update;

        const inventory = await Inventory.findOne({ product: productId });
        if (!inventory) {
          results.failed++;
          results.errors.push({ productId, error: "Inventory not found" });
          continue;
        }

        if (quantity !== undefined) {
          const diff = parseInt(quantity) - inventory.quantity;
          await inventory.addStock(diff, "Bulk update", req.user.id);
        }

        if (lowStockThreshold !== undefined) {
          inventory.lowStockThreshold = parseInt(lowStockThreshold);
        }

        await inventory.save();

        // Update product stock
        await Product.findByIdAndUpdate(productId, {
          totalStock: inventory.quantity,
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          productId: update.productId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: results,
      message: `Updated ${results.success} of ${updates.length} items`,
    });
  } catch (error) {
    next(error);
  }
};
