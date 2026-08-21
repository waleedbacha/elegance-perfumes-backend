/**
 * Inventory Model
 * Complete inventory management with tracking
 */

const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    // ==========================================
    // PRODUCT REFERENCE
    // ==========================================
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },

    // ==========================================
    // STOCK INFORMATION
    // ==========================================
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Quantity reserved for pending orders",
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
      description: "Quantity available for sale (quantity - reservedQuantity)",
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    status: {
      type: String,
      enum: ["in-stock", "low-stock", "out-of-stock", "discontinued"],
      default: "out-of-stock",
    },

    // ==========================================
    // LOCATIONS
    // ==========================================
    locations: [
      {
        name: {
          type: String,
          required: true,
        },
        address: {
          street: String,
          city: String,
          state: String,
          zipCode: String,
          country: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        reserved: {
          type: Number,
          default: 0,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        notes: String,
      },
    ],

    // ==========================================
    // SUPPLIER INFORMATION
    // ==========================================
    suppliers: [
      {
        name: {
          type: String,
          required: true,
        },
        contact: String,
        email: String,
        phone: String,
        leadTime: {
          type: Number,
          default: 7,
          description: "Lead time in days",
        },
        costPrice: {
          type: Number,
          min: 0,
        },
        minimumOrder: {
          type: Number,
          default: 1,
        },
        isPreferred: {
          type: Boolean,
          default: false,
        },
        notes: String,
      },
    ],

    // ==========================================
    // RESTOCK INFORMATION
    // ==========================================
    lastRestockDate: Date,
    nextRestockDate: Date,
    restockFrequency: {
      type: Number,
      description: "Restock frequency in days",
    },
    reorderPoint: {
      type: Number,
      default: 10,
      min: 0,
      description: "Quantity at which to reorder",
    },

    // ==========================================
    // COST INFORMATION
    // ==========================================
    costPerUnit: {
      type: Number,
      min: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
    },
    averageCost: {
      type: Number,
      min: 0,
    },

    // ==========================================
    // HISTORY
    // ==========================================
    history: [
      {
        type: {
          type: String,
          enum: [
            "restock",
            "sale",
            "adjustment",
            "return",
            "reservation",
            "cancellation",
            "damage",
            "theft",
          ],
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        previousQuantity: Number,
        newQuantity: Number,
        reason: String,
        notes: String,
        reference: {
          id: {
            type: mongoose.Schema.Types.ObjectId,
          },
          type: {
            type: String,
            enum: ["order", "product", "supplier", "user"],
          },
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        date: {
          type: Date,
          default: Date.now,
        },
        location: String,
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    // ==========================================
    // ALERTS
    // ==========================================
    alerts: [
      {
        type: {
          type: String,
          enum: ["low-stock", "out-of-stock", "restock-needed"],
        },
        message: String,
        isRead: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
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
inventorySchema.index({ product: 1 }, { unique: true });
inventorySchema.index({ status: 1 });
inventorySchema.index({ quantity: 1 });
inventorySchema.index({ lowStockThreshold: 1 });
inventorySchema.index({ "locations.city": 1 });
inventorySchema.index({ "history.date": -1 });

// Compound indexes
inventorySchema.index({ status: 1, quantity: 1 });
inventorySchema.index({ quantity: 1, lowStockThreshold: 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
inventorySchema.virtual("isLowStock").get(function () {
  return (
    this.availableQuantity > 0 &&
    this.availableQuantity <= this.lowStockThreshold
  );
});

inventorySchema.virtual("isOutOfStock").get(function () {
  return this.availableQuantity <= 0;
});

inventorySchema.virtual("needsRestock").get(function () {
  return this.availableQuantity <= this.reorderPoint;
});

inventorySchema.virtual("totalLocations").get(function () {
  return this.locations.length;
});

inventorySchema.virtual("stockValue").get(function () {
  return this.availableQuantity * (this.averageCost || this.costPerUnit || 0);
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
inventorySchema.pre("save", function (next) {
  // Calculate available quantity
  this.availableQuantity = Math.max(0, this.quantity - this.reservedQuantity);

  // Update status
  if (this.availableQuantity <= 0) {
    this.status = "out-of-stock";
  } else if (this.availableQuantity <= this.lowStockThreshold) {
    this.status = "low-stock";
  } else {
    this.status = "in-stock";
  }

  // Update total cost
  if (this.costPerUnit && this.quantity) {
    this.totalCost = this.costPerUnit * this.quantity;
  }

  // Update locations total
  if (this.locations && this.locations.length > 0) {
    const totalLocationQty = this.locations.reduce(
      (sum, loc) => sum + loc.quantity,
      0,
    );
    if (this.quantity !== totalLocationQty) {
      // Sync main quantity with locations
      this.quantity = totalLocationQty;
    }
  }

  next();
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Add stock
 */
inventorySchema.methods.addStock = async function (
  quantity,
  reason = "",
  performedBy = null,
  notes = "",
) {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  const previousQuantity = this.quantity;
  this.quantity += quantity;

  this.history.push({
    type: "restock",
    quantity: quantity,
    previousQuantity,
    newQuantity: this.quantity,
    reason,
    notes,
    performedBy,
    date: new Date(),
  });

  this.lastRestockDate = new Date();
  this.updatedAt = new Date();

  await this.save();
  return this;
};

/**
 * Deduct stock (for sales)
 */
inventorySchema.methods.deductStock = async function (
  quantity,
  reason = "",
  reference = null,
  performedBy = null,
) {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  if (this.availableQuantity < quantity) {
    throw new Error(
      `Insufficient stock. Available: ${this.availableQuantity}, Required: ${quantity}`,
    );
  }

  const previousQuantity = this.quantity;
  this.quantity -= quantity;

  this.history.push({
    type: "sale",
    quantity: -quantity,
    previousQuantity,
    newQuantity: this.quantity,
    reason,
    reference,
    performedBy,
    date: new Date(),
  });

  this.updatedAt = new Date();

  // Check for low stock alert
  if (this.isLowStock) {
    this.alerts.push({
      type: "low-stock",
      message: `Product stock is low. Current: ${this.availableQuantity}, Threshold: ${this.lowStockThreshold}`,
    });
  }

  await this.save();
  return this;
};

/**
 * Reserve stock
 */
inventorySchema.methods.reserveStock = async function (
  quantity,
  reference = null,
) {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  if (this.availableQuantity < quantity) {
    throw new Error(
      `Insufficient stock to reserve. Available: ${this.availableQuantity}, Required: ${quantity}`,
    );
  }

  this.reservedQuantity += quantity;

  this.history.push({
    type: "reservation",
    quantity: quantity,
    previousQuantity: this.quantity,
    newQuantity: this.quantity,
    reason: "Stock reserved for order",
    reference,
    date: new Date(),
  });

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Release reserved stock
 */
inventorySchema.methods.releaseReservedStock = async function (
  quantity,
  reason = "",
) {
  if (quantity <= 0) {
    throw new Error("Quantity must be positive");
  }

  if (this.reservedQuantity < quantity) {
    throw new Error(
      `Cannot release more than reserved. Reserved: ${this.reservedQuantity}, Requested: ${quantity}`,
    );
  }

  this.reservedQuantity -= quantity;

  this.history.push({
    type: "cancellation",
    quantity: -quantity,
    previousQuantity: this.quantity,
    newQuantity: this.quantity,
    reason: `Stock released: ${reason}`,
    date: new Date(),
  });

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Adjust stock (manual adjustment)
 */
inventorySchema.methods.adjustStock = async function (
  newQuantity,
  reason = "",
  performedBy = null,
) {
  if (newQuantity < 0) {
    throw new Error("Quantity cannot be negative");
  }

  const previousQuantity = this.quantity;
  const difference = newQuantity - this.quantity;

  this.quantity = newQuantity;

  this.history.push({
    type: "adjustment",
    quantity: difference,
    previousQuantity,
    newQuantity: this.quantity,
    reason,
    performedBy,
    date: new Date(),
  });

  this.updatedAt = new Date();
  await this.save();
  return this;
};

/**
 * Update location stock
 */
inventorySchema.methods.updateLocation = async function (
  locationName,
  quantity,
  performedBy = null,
) {
  const location = this.locations.find((loc) => loc.name === locationName);

  if (!location) {
    throw new Error(`Location "${locationName}" not found`);
  }

  const previousQuantity = location.quantity;
  location.quantity = quantity;

  this.history.push({
    type: "adjustment",
    quantity: quantity - previousQuantity,
    previousQuantity: this.quantity,
    newQuantity: this.quantity,
    reason: `Location update: ${locationName}`,
    location: locationName,
    performedBy,
    date: new Date(),
  });

  this.updatedAt = new Date();
  await this.save();
  return this;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get inventory summary
 */
inventorySchema.statics.getSummary = async function () {
  const summary = await this.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: "$quantity" },
        totalAvailable: { $sum: "$availableQuantity" },
        totalReserved: { $sum: "$reservedQuantity" },
        totalValue: {
          $sum: { $multiply: ["$quantity", { $ifNull: ["$averageCost", 0] }] },
        },
        inStock: {
          $sum: { $cond: [{ $eq: ["$status", "in-stock"] }, 1, 0] },
        },
        lowStock: {
          $sum: { $cond: [{ $eq: ["$status", "low-stock"] }, 1, 0] },
        },
        outOfStock: {
          $sum: { $cond: [{ $eq: ["$status", "out-of-stock"] }, 1, 0] },
        },
        discontinued: {
          $sum: { $cond: [{ $eq: ["$status", "discontinued"] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    summary[0] || {
      totalProducts: 0,
      totalStock: 0,
      totalAvailable: 0,
      totalReserved: 0,
      totalValue: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      discontinued: 0,
    }
  );
};

/**
 * Get low stock products
 */
inventorySchema.statics.getLowStock = async function (threshold = null) {
  const query = {
    $expr: {
      $and: [
        { $gt: ["$availableQuantity", 0] },
        {
          $lte: [
            "$availableQuantity",
            { $ifNull: [threshold, "$lowStockThreshold"] },
          ],
        },
      ],
    },
  };

  return this.find(query)
    .populate("product", "name brand price images")
    .sort({ availableQuantity: 1 });
};

/**
 * Get out of stock products
 */
inventorySchema.statics.getOutOfStock = async function () {
  return this.find({ availableQuantity: { $lte: 0 } })
    .populate("product", "name brand price images")
    .sort({ updatedAt: -1 });
};

/**
 * Get inventory report
 */
inventorySchema.statics.getReport = async function (startDate, endDate) {
  const query = {
    "history.date": {
      $gte: startDate,
      $lte: endDate,
    },
  };

  return this.aggregate([
    { $unwind: "$history" },
    { $match: query },
    {
      $group: {
        _id: "$product",
        totalRestocked: {
          $sum: {
            $cond: [
              { $eq: ["$history.type", "restock"] },
              "$history.quantity",
              0,
            ],
          },
        },
        totalSold: {
          $sum: {
            $cond: [
              { $eq: ["$history.type", "sale"] },
              { $abs: "$history.quantity" },
              0,
            ],
          },
        },
        totalAdjusted: {
          $sum: {
            $cond: [
              { $eq: ["$history.type", "adjustment"] },
              "$history.quantity",
              0,
            ],
          },
        },
        transactions: { $sum: 1 },
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
    { $unwind: "$product" },
    { $sort: { totalSold: -1 } },
  ]);
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Inventory", inventorySchema);

