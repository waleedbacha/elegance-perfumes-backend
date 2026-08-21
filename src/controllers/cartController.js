/**
 * Cart Controller
 * Shopping cart management
 */

const { AppError } = require("../middleware/errorHandler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Analytics = require("../models/Analytics");
const { MESSAGES } = require("../config/constants");

/**
 * Get cart (Guest & Logged-in users)
 */
exports.getCart = async (req, res, next) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || req.cookies?.sessionId;

    let cart;

    if (userId) {
      cart = await Cart.findOne({
        user: userId,
        status: "active",
      }).populate("items.product", "name brand price images discount totalStock");
    } else if (sessionId) {
      cart = await Cart.findOne({
        sessionId,
        status: "active",
      }).populate("items.product", "name brand price images discount totalStock");
    }

    if (!cart) {
      // Create empty cart
      const newCart = new Cart({
        ...(userId ? { user: userId } : { sessionId }),
        status: "active",
        items: [],
        shipping: 200,
      });
      await newCart.save();

      return res.status(200).json({
        success: true,
        data: {
          cart: {
            ...newCart.toObject(),
            productDiscount: 0,
            couponDiscount: 0,
            discount: 0,
          },
        },
      });
    }

    if (!cart.shipping || cart.shipping === 0) {
      cart.shipping = 200;
      await cart.save();
    }

    const cartData = cart.toObject();

    res.status(200).json({
      success: true,
      data: {
        cart: {
          ...cartData,
          productDiscount: cart.productDiscount || 0,
          couponDiscount: cart.couponDiscount || 0,
          discount: cart.discount || 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get cart error:", error);
    next(error);
  }
};

/**
 * Add item to cart (Guest & Logged-in users)
 */
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, size, quantity = 1 } = req.body;
    const userId = req.user?.id || null;
    // ✅ Get session ID from cookies or generate one
    let sessionId = req.cookies?.sessionId;

    // If no session ID and user is not logged in, generate one
    if (!sessionId && !userId) {
      const crypto = require('crypto');
      sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
      
      // Set cookie
      res.cookie("sessionId", sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    if (!productId || !size) {
      throw new AppError(
        "Product ID and size are required",
        400,
        "MISSING_FIELDS",
      );
    }

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // Check stock
    const available = product.hasStock(size, parseInt(quantity));
    if (!available) {
      throw new AppError(
        `Insufficient stock for ${product.name} (${size})`,
        400,
        "INSUFFICIENT_STOCK",
      );
    }

    // Get or create cart
    let cart;
    if (userId) {
      // Logged in user
      cart = await Cart.findOne({ user: userId, status: "active" });
    } else if (sessionId) {
      // Guest with session
      cart = await Cart.findOne({ sessionId, status: "active" });
    }

    if (!cart) {
      cart = new Cart({
        ...(userId ? { user: userId } : { sessionId }),
        status: "active",
        items: [],
      });
    }

    // Get price for the specific size
    const price = product.getPriceForSize(size);
    const discountPercentage = product.discount || 0;
    const discountAmount = (price * discountPercentage) / 100;
    const finalPrice = price - discountAmount;

    // Add item
    await cart.addItem({
      productId: product._id,
      name: product.name,
      brand: product.brand,
      image:
        product.images?.find((img) => img.isMain)?.url ||
        product.images?.[0]?.url,
      size,
      quantity: parseInt(quantity),
      price: price,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
    });

    // Populate product details
    await cart.populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    res.status(200).json({
      success: true,
      data: { cart },
      message: "Item added to cart",
    });
  } catch (error) {
    console.error("❌ Add to cart error:", error);
    next(error);
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const { productId, size, quantity } = req.body;

    if (!productId || !size || quantity === undefined) {
      throw new AppError(
        "Product ID, size, and quantity are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!cart) {
      throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
    }

    // Check stock if quantity > 0
    if (parseInt(quantity) > 0) {
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
      }

      const available = product.hasStock(size, parseInt(quantity));
      if (!available) {
        throw new AppError(
          `Insufficient stock for ${product.name} (${size})`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }
    }

    await cart.updateItemQuantity(productId, size, parseInt(quantity));

    await cart.populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    res.status(200).json({
      success: true,
      data: { cart },
      message: quantity > 0 ? "Cart updated" : "Item removed from cart",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const { productId, size } = req.params;

    if (!productId || !size) {
      throw new AppError(
        "Product ID and size are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!cart) {
      throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
    }

    await cart.removeItem(productId, size);

    await cart.populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    res.status(200).json({
      success: true,
      data: { cart },
      message: "Item removed from cart",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear cart
 */
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!cart) {
      throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
    }

    await cart.clearCart();

    res.status(200).json({
      success: true,
      data: { cart },
      message: "Cart cleared",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Apply coupon to cart
 */
exports.applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError("Coupon code is required", 400, "MISSING_CODE");
    }

    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!cart) {
      throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
    }

    if (cart.isEmpty) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    // Get product IDs
    const productIds = cart.items.map((item) => item.product);

    // Validate coupon
    const validation = await Coupon.validateCoupon(
      code,
      req.user.id,
      cart.subtotal,
      productIds,
    );

    if (!validation.valid) {
      throw new AppError(validation.reason, 400, "INVALID_COUPON");
    }

    // Get coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    // Calculate discount using the coupon's method
    const discountAmount = coupon.calculateDiscount(cart.subtotal);

    // Apply coupon - store the percentage value
    await cart.applyCoupon({
      code: coupon.code,
      discount: coupon.discountValue,
      type: coupon.discountType,
      couponId: coupon._id,
    });

    // ✅ Save cart to trigger pre-save hook
    await cart.save();

    // ✅ Populate product details
    await cart.populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    // ✅ Fetch fresh cart with all calculations
    const updatedCart = await Cart.findById(cart._id).populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    // ✅ Return with all discount fields
    const cartData = updatedCart.toObject();

    console.log("✅ Coupon applied. Discounts:", {
      productDiscount: updatedCart.productDiscount,
      couponDiscount: updatedCart.couponDiscount,
      discount: updatedCart.discount,
      total: updatedCart.total,
    });

    res.status(200).json({
      success: true,
      data: {
        cart: {
          ...cartData,
          productDiscount: updatedCart.productDiscount || 0,
          couponDiscount: updatedCart.couponDiscount || 0,
          discount: updatedCart.discount || 0,
        },
      },
      message: `Coupon ${code} applied successfully`,
    });
  } catch (error) {
    console.error("❌ Apply coupon error:", error);
    next(error);
  }
};

/**
 * Remove coupon from cart
 */
exports.removeCoupon = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    });

    if (!cart) {
      throw new AppError("Cart not found", 404, "CART_NOT_FOUND");
    }

    await cart.removeCoupon();

    await cart.populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    res.status(200).json({
      success: true,
      data: { cart },
      message: "Coupon removed",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cart summary (for checkout)
 */
exports.getCartSummary = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.id,
      status: "active",
    }).populate("items.product", "name brand price images discount totalStock");

    if (!cart || cart.isEmpty) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          summary: {
            subtotal: 0,
            productDiscount: 0,
            couponDiscount: 0,
            discount: 0,
            tax: 0,
            shipping: 0,
            total: 0,
            itemCount: 0,
          },
        },
      });
    }

    // Check stock for all items
    const stockIssues = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product || !product.hasStock(item.size, item.quantity)) {
        stockIssues.push({
          productId: item.product._id,
          name: item.name,
          size: item.size,
          requested: item.quantity,
          available:
            product?.sizes?.find((s) => s.size === item.size)?.stock || 0,
        });
      }
    }

    // ✅ Return with all discount fields
    res.status(200).json({
      success: true,
      data: {
        items: cart.items,
        summary: {
          subtotal: cart.subtotal || 0,
          productDiscount: cart.productDiscount || 0,
          couponDiscount: cart.couponDiscount || 0,
          discount: cart.discount || 0,
          tax: cart.tax || 0,
          shipping: cart.shipping || 0,
          total: cart.total || 0,
          itemCount: cart.itemCount || 0,
        },
        coupon: cart.coupon,
        stockIssues,
        hasStockIssues: stockIssues.length > 0,
      },
    });
  } catch (error) {
    console.error("❌ Get cart summary error:", error);
    next(error);
  }
};

/**
 * Merge guest cart to user cart
 */
exports.mergeCart = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400, "MISSING_SESSION_ID");
    }

    const cart = await Cart.mergeCarts(sessionId, req.user.id);

    await cart.populate(
      "items.product",
      "name brand price images discount totalStock",
    );

    res.status(200).json({
      success: true,
      data: { cart },
      message: "Cart merged successfully",
    });
  } catch (error) {
    next(error);
  }
};
