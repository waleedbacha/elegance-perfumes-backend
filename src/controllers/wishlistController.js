/**
 * Wishlist Controller
 * User wishlist management
 */

const { AppError } = require("../middleware/errorHandler");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const Analytics = require("../models/Analytics");
const Notification = require("../models/Notification");

/**
 * Get wishlist
 */
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.getByUser(req.user.id);
    await wishlist.populate(
      "items.product",
      "name brand price comparePrice discount images ratings totalStock status",
    );

    res.status(200).json({
      success: true,
      data: { wishlist },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add to wishlist
 */
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      throw new AppError("Product ID is required", 400, "MISSING_PRODUCT_ID");
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const wishlist = await Wishlist.getByUser(req.user.id);

    await wishlist.addProduct({
      productId,
      priceData: {
        price: product.price,
        discount: product.discount,
        comparePrice: product.comparePrice,
      },
    });

    // Increment wishlist count on product
    await Product.findByIdAndUpdate(productId, {
      $inc: { wishlistCount: 1 },
    });

    // Track analytics
    await Analytics.track({
      type: "wishlist-add",
      user: req.user.id,
      reference: { model: "Product", id: productId },
      data: {
        productId,
        productName: product.name,
        productBrand: product.brand,
      },
    });

    await wishlist.populate("items.product", "name brand price images");

    res.status(200).json({
      success: true,
      data: { wishlist },
      message: "Added to wishlist",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove from wishlist
 */
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      throw new AppError("Product ID is required", 400, "MISSING_PRODUCT_ID");
    }

    const wishlist = await Wishlist.getByUser(req.user.id);

    if (!wishlist.hasProduct(productId)) {
      throw new AppError("Product not in wishlist", 404, "NOT_IN_WISHLIST");
    }

    await wishlist.removeProduct(productId);

    // Decrement wishlist count on product
    await Product.findByIdAndUpdate(productId, {
      $inc: { wishlistCount: -1 },
    });

    // Track analytics
    await Analytics.track({
      type: "wishlist-remove",
      user: req.user.id,
      reference: { model: "Product", id: productId },
    });

    res.status(200).json({
      success: true,
      data: { wishlist },
      message: "Removed from wishlist",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle wishlist
 */
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      throw new AppError("Product ID is required", 400, "MISSING_PRODUCT_ID");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const wishlist = await Wishlist.getByUser(req.user.id);

    const result = await wishlist.toggleProduct(productId, {
      priceData: {
        price: product.price,
        discount: product.discount,
        comparePrice: product.comparePrice,
      },
    });

    // Update product wishlist count
    await Product.findByIdAndUpdate(productId, {
      $inc: { wishlistCount: result.inWishlist ? 1 : -1 },
    });

    // Track analytics
    await Analytics.track({
      type: result.inWishlist ? "wishlist-add" : "wishlist-remove",
      user: req.user.id,
      reference: { model: "Product", id: productId },
      data: {
        productId,
        productName: product.name,
      },
    });

    await wishlist.populate("items.product", "name brand price images");

    res.status(200).json({
      success: true,
      data: {
        wishlist,
        inWishlist: result.inWishlist,
      },
      message: result.inWishlist
        ? "Added to wishlist"
        : "Removed from wishlist",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if in wishlist
 */
exports.checkWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      throw new AppError("Product ID is required", 400, "MISSING_PRODUCT_ID");
    }

    const wishlist = await Wishlist.getByUser(req.user.id);
    const inWishlist = wishlist.hasProduct(productId);

    res.status(200).json({
      success: true,
      data: { inWishlist },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk check wishlist
 */
exports.bulkCheckWishlist = async (req, res, next) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      throw new AppError(
        "Product IDs array is required",
        400,
        "MISSING_PRODUCT_IDS",
      );
    }

    const wishlist = await Wishlist.getByUser(req.user.id);

    const result = {};
    productIds.forEach((id) => {
      result[id] = wishlist.hasProduct(id);
    });

    res.status(200).json({
      success: true,
      data: { inWishlist: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set price drop notification
 */
exports.setPriceDropNotification = async (req, res, next) => {
  try {
    const { productId, notify } = req.body;

    if (!productId) {
      throw new AppError("Product ID is required", 400, "MISSING_PRODUCT_ID");
    }

    const wishlist = await Wishlist.getByUser(req.user.id);

    const item = wishlist.items.find(
      (item) => item.product.toString() === productId,
    );

    if (!item) {
      throw new AppError("Product not in wishlist", 404, "NOT_IN_WISHLIST");
    }

    item.notifyOnPriceDrop = notify;
    await wishlist.save();

    res.status(200).json({
      success: true,
      data: {
        productId,
        notifyOnPriceDrop: item.notifyOnPriceDrop,
      },
      message: notify
        ? "Price drop notification enabled"
        : "Price drop notification disabled",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set back in stock notification
 */
exports.setBackInStockNotification = async (req, res, next) => {
  try {
    const { productId, notify } = req.body;

    if (!productId) {
      throw new AppError("Product ID is required", 400, "MISSING_PRODUCT_ID");
    }

    const wishlist = await Wishlist.getByUser(req.user.id);

    const item = wishlist.items.find(
      (item) => item.product.toString() === productId,
    );

    if (!item) {
      throw new AppError("Product not in wishlist", 404, "NOT_IN_WISHLIST");
    }

    item.notifyOnBackInStock = notify;
    await wishlist.save();

    res.status(200).json({
      success: true,
      data: {
        productId,
        notifyOnBackInStock: item.notifyOnBackInStock,
      },
      message: notify
        ? "Back in stock notification enabled"
        : "Back in stock notification disabled",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get price drop items
 */
exports.getPriceDropItems = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.getByUser(req.user.id);
    await wishlist.populate(
      "items.product",
      "name brand price comparePrice images",
    );

    const priceDrops = wishlist.items
      .filter((item) => {
        const currentPrice = item.product.price;
        const addedPrice = item.priceSnapshot?.price || 0;
        return currentPrice < addedPrice;
      })
      .map((item) => ({
        product: item.product,
        originalPrice: item.priceSnapshot?.price || 0,
        currentPrice: item.product.price,
        savings: (item.priceSnapshot?.price || 0) - item.product.price,
        savingsPercentage: Math.round(
          (((item.priceSnapshot?.price || 0) - item.product.price) /
            (item.priceSnapshot?.price || 1)) *
            100,
        ),
      }));

    res.status(200).json({
      success: true,
      data: { priceDrops },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get wishlist stats
 */
exports.getWishlistStats = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.getByUser(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        totalItems: wishlist.totalItems,
        totalValue: wishlist.totalValue,
        priceDropItems: wishlist.items.filter((item) => {
          const currentPrice = item.priceSnapshot?.price || 0;
          const lowestPrice = item.lowestPrice || Infinity;
          return currentPrice < lowestPrice;
        }).length,
        outOfStockItems: wishlist.items.filter((item) => {
          return item.product.totalStock <= 0;
        }).length,
      },
    });
  } catch (error) {
    next(error);
  }
};
