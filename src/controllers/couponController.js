/**
 * Coupon Controller
 * Coupon management
 */

const { AppError } = require("../middleware/errorHandler");
const Coupon = require("../models/Coupon");
const { MESSAGES } = require("../config/constants");

/**
 * Validate coupon
 */
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { orderAmount = 0, productIds = [] } = req.query;

    if (!code) {
      throw new AppError("Coupon code is required", 400, "MISSING_CODE");
    }

    const validation = await Coupon.validateCoupon(
      code,
      req.user?.id || null,
      parseFloat(orderAmount),
      productIds
        ? typeof productIds === "string"
          ? productIds.split(",")
          : productIds
        : [],
    );

    if (!validation.valid) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
          reason: validation.reason,
        },
      });
    }

    // Get coupon details
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    const discount = coupon.calculateDiscount(parseFloat(orderAmount));

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        coupon: {
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: discount,
          maxDiscount: coupon.maxDiscount,
          minOrderAmount: coupon.minOrderAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN COUPON CONTROLLERS
// ==========================================

/**
 * Create coupon (Admin)
 */
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderAmount,
      validFrom,
      validUntil,
      usageLimit,
      perUserLimit,
      applicableProducts,
      applicableCategories,
      applicableBrands,
      excludedProducts,
      excludedCategories,
      userRestrictions,
    } = req.body;

    // Validate required fields
    if (
      !code ||
      !name ||
      !discountType ||
      !discountValue ||
      !validFrom ||
      !validUntil
    ) {
      throw new AppError("Missing required fields", 400, "MISSING_FIELDS");
    }

    // Check if coupon exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      throw new AppError("Coupon code already exists", 409, "COUPON_EXISTS");
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      name,
      description,
      discountType,
      discountValue: parseFloat(discountValue),
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      usageLimit: usageLimit ? parseInt(usageLimit) : 1,
      perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      applicableBrands: applicableBrands || [],
      excludedProducts: excludedProducts || [],
      excludedCategories: excludedCategories || [],
      userRestrictions: userRestrictions || {},
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      data: { coupon },
      message: "Coupon created successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all coupons (Admin)
 */
exports.getAllCoupons = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      discountType,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (discountType) query.discountType = discountType;

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [coupons, total] = await Promise.all([
      Coupon.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Coupon.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        coupons,
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
 * Get coupon details (Admin)
 */
exports.getCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError("Coupon not found", 404, "COUPON_NOT_FOUND");
    }

    // Get usage stats
    const stats = await Coupon.getUsageStats(id);

    res.status(200).json({
      success: true,
      data: {
        coupon,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update coupon (Admin)
 */
exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError("Coupon not found", 404, "COUPON_NOT_FOUND");
    }

    // Update allowed fields
    const allowedUpdates = [
      "name",
      "description",
      "discountValue",
      "maxDiscount",
      "minOrderAmount",
      "validFrom",
      "validUntil",
      "isActive",
      "usageLimit",
      "perUserLimit",
      "applicableProducts",
      "applicableCategories",
      "applicableBrands",
      "excludedProducts",
      "excludedCategories",
      "userRestrictions",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        coupon[field] = updates[field];
      }
    });

    await coupon.save();

    res.status(200).json({
      success: true,
      data: { coupon },
      message: "Coupon updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete coupon (Admin)
 */
exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError("Coupon not found", 404, "COUPON_NOT_FOUND");
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle coupon status (Admin)
 */
exports.toggleCouponStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new AppError("Coupon not found", 404, "COUPON_NOT_FOUND");
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      data: { coupon },
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get coupon analytics (Admin)
 */
exports.getCouponAnalytics = async (req, res, next) => {
  try {
    const stats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalCoupons: { $sum: 1 },
          activeCoupons: { $sum: { $cond: ["$isActive", 1, 0] } },
          totalUses: { $sum: "$usedCount" },
          averageUses: { $avg: "$usedCount" },
          byType: {
            $push: {
              type: "$discountType",
              count: 1,
              uses: "$usedCount",
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalCoupons: 0,
        activeCoupons: 0,
        totalUses: 0,
        averageUses: 0,
        byType: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete coupons (Admin)
 */
exports.bulkDeleteCoupons = async (req, res, next) => {
  try {
    const { couponIds } = req.body;

    if (!couponIds || !Array.isArray(couponIds) || couponIds.length === 0) {
      throw new AppError("Coupon IDs are required", 400, "MISSING_COUPON_IDS");
    }

    const result = await Coupon.deleteMany({
      _id: { $in: couponIds },
    });

    res.status(200).json({
      success: true,
      data: { deleted: result.deletedCount },
      message: `${result.deletedCount} coupons deleted`,
    });
  } catch (error) {
    next(error);
  }
};
