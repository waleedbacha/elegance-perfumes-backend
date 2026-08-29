/**
 * Order Controller
 * Complete order management
 */

const { AppError } = require("../middleware/errorHandler");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Inventory = require("../models/Inventory");
const Coupon = require("../models/Coupon");
const Analytics = require("../models/Analytics");
const Notification = require("../models/Notification");
const emailService = require("../services/emailService");
const smsService = require("../services/smsService");
const invoiceService = require("../services/invoiceService");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  MESSAGES,
} = require("../config/constants");

/**
 * Create order
 */
/**
 * Create order - Updated with WhatsApp integration
 */
/**
 * Create order - COMPLETE FIXED VERSION
 */
exports.createOrder = async (req, res, next) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      couponCode,
      notes,
      giftMessage,
      isGift,
      giftWrap,
      customerPhone,
    } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    // Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // ✅ Format phone for WhatsApp
    const formatPhoneForWhatsApp = (phone) => {
      if (!phone) return null;
      let cleaned = phone.replace(/\D/g, "");
      if (cleaned.startsWith("0")) {
        cleaned = cleaned.substring(1);
      }
      if (cleaned.length > 0 && !cleaned.startsWith("92")) {
        cleaned = `92${cleaned}`;
      }
      if (cleaned.length === 12) {
        return cleaned;
      }
      return cleaned;
    };

    // ✅ Save phone to user if provided
    let finalPhone = user.phone;

    if (customerPhone && customerPhone.trim() !== "") {
      finalPhone = formatPhoneForWhatsApp(customerPhone);
      if (!user.phone || user.phone === null) {
        user.phone = finalPhone;
        await user.save({ validateBeforeSave: false });
        console.log(
          `📱 Phone number saved for user ${user.email}: ${finalPhone}`,
        );
      }
    } else if (shippingAddress?.phone && shippingAddress.phone !== "") {
      finalPhone = formatPhoneForWhatsApp(shippingAddress.phone);
      if (!user.phone || user.phone === null) {
        user.phone = finalPhone;
        await user.save({ validateBeforeSave: false });
        console.log(
          `📱 Phone number saved for user ${user.email}: ${finalPhone}`,
        );
      }
    }

    if (!finalPhone || finalPhone === null || finalPhone === "") {
      finalPhone = "N/A";
    }

    if (shippingAddress?.phone) {
      shippingAddress.phone =
        formatPhoneForWhatsApp(shippingAddress.phone) || shippingAddress.phone;
    }

    // ==========================================
    // ✅ PROCESS ITEMS - FIXED
    // ==========================================

    let subtotal = 0; // ← ORIGINAL price before any discounts (comparePrice)
    let totalProductDiscount = 0; // ← Total product discount
    let subtotalAfterProductDiscount = 0; // ← After product discount
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new AppError(
          `Product ${item.productId} not found`,
          404,
          "PRODUCT_NOT_FOUND",
        );
      }

      const availableStock = product.hasStock(item.size, item.quantity);
      if (!availableStock) {
        throw new AppError(
          `Insufficient stock for ${product.name} (${item.size})`,
          400,
          "INSUFFICIENT_STOCK",
        );
      }

      // ✅ Get price data from the size
      const sizeItem = product.sizes.find((s) => s.size === item.size);

      // ✅ ORIGINAL PRICE: Use comparePrice (or price if comparePrice not available)
      const originalPrice =
        sizeItem?.comparePrice ||
        sizeItem?.price ||
        product.comparePrice ||
        product.price;

      // ✅ SALE PRICE: Use price
      const salePrice = sizeItem?.price || product.price;

      // ✅ Calculate discount
      const discountAmount = Math.max(0, originalPrice - salePrice);

      // ✅ Final price per unit is the sale price
      const finalPrice = salePrice;
      const totalPrice = finalPrice * item.quantity;

      // ✅ Track ALL price components
      subtotal += originalPrice * item.quantity; // ← ORIGINAL price (comparePrice)
      totalProductDiscount += discountAmount * item.quantity; // ← Total discount
      subtotalAfterProductDiscount += finalPrice * item.quantity; // ← After product discount

      processedItems.push({
        product: product._id,
        name: product.name,
        brand: product.brand,
        size: item.size,
        quantity: item.quantity,
        price: originalPrice, // Original price (comparePrice)
        discount: discountAmount, // Discount per unit
        total: totalPrice, // Final price after discount
        image:
          product.images?.find((img) => img.isMain)?.url ||
          product.images?.[0]?.url,
      });
    }

    // ==========================================
    // ✅ APPLY COUPON
    // ==========================================

    let couponDiscount = 0;
    let couponData = null;

    if (couponCode) {
      // ✅ Coupon should be applied on subtotal AFTER product discount
      const validation = await Coupon.validateCoupon(
        couponCode,
        user._id,
        subtotalAfterProductDiscount, // ← Use price after product discount
        processedItems.map((item) => item.product),
      );

      if (validation.valid) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
        couponDiscount = coupon.calculateDiscount(subtotalAfterProductDiscount);

        couponData = {
          code: coupon.code,
          discount: coupon.discountValue,
          type: coupon.discountType,
          couponId: coupon._id,
        };

        console.log("✅ Coupon applied:", {
          code: coupon.code,
          discountValue: coupon.discountValue,
          discountType: coupon.discountType,
          calculatedDiscount: couponDiscount,
        });
      } else {
        throw new AppError(validation.reason, 400, "INVALID_COUPON");
      }
    }

    // ==========================================
    // ✅ CALCULATE FINAL TOTALS
    // ==========================================

    const shipping = 200;
    const totalAfterProductDiscount = subtotal - totalProductDiscount;
    const totalAfterCoupon = totalAfterProductDiscount - couponDiscount;
    const total = totalAfterCoupon + shipping;

    // ==========================================
    // ✅ DEBUG LOG - Check the values
    // ==========================================

    console.log("📊 ===== ORDER CALCULATION =====");
    console.log(`  Original Subtotal (comparePrice): ${subtotal}`);
    console.log(`  Product Discount: ${totalProductDiscount}`);
    console.log(
      `  Subtotal After Product Discount: ${totalAfterProductDiscount}`,
    );
    console.log(`  Coupon Discount: ${couponDiscount}`);
    console.log(`  Shipping: ${shipping}`);
    console.log(`  Final Total: ${total}`);
    console.log("=================================");

    // Create order number
    const orderNumber = await Order.generateOrderNumber();

    // ==========================================
    // ✅ CREATE ORDER
    // ==========================================

    const order = new Order({
      orderNumber,
      user: user._id,
      customer: {
        name: user.name,
        email: user.email,
        phone: finalPhone,
        notes,
      },
      shippingAddress: {
        name: shippingAddress.name || user.name,
        phone: shippingAddress.phone || finalPhone,
        street: shippingAddress.street,
        area: shippingAddress.area,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || "Pakistan",
        landmark: shippingAddress.landmark,
        deliveryInstructions: shippingAddress.deliveryInstructions,
      },
      billingAddress: billingAddress || {
        sameAsShipping: true,
      },
      items: processedItems,
      subtotal: subtotal, // ← ORIGINAL price before any discounts
      productDiscount: totalProductDiscount, // ← Total product discount
      couponDiscount: couponDiscount, // ← Coupon discount
      coupon: couponData,
      shipping: shipping,
      tax: 0,
      total: total, // ← Final total
      paymentMethod,
      paymentStatus:
        paymentMethod === "cod"
          ? PAYMENT_STATUS.PENDING
          : PAYMENT_STATUS.PENDING,
      giftMessage,
      isGift: isGift || false,
      giftWrap: giftWrap || false,
      source: req.body.source || "website",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      referrer: req.get("referer"),
    });

    // Save order
    await order.save();

    // ==========================================
    // UPDATE STOCK
    // ==========================================

    for (const item of processedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { totalStock: -item.quantity, purchasedCount: item.quantity },
      });

      let inventory = await Inventory.findOne({ product: item.product });

      if (!inventory) {
        const product = await Product.findById(item.product);
        inventory = new Inventory({
          product: item.product,
          quantity: product.totalStock - item.quantity,
          availableQuantity: product.totalStock - item.quantity,
          reservedQuantity: 0,
          lowStockThreshold: product.lowStockThreshold || 5,
          status:
            product.totalStock - item.quantity <= 0
              ? "out-of-stock"
              : product.totalStock - item.quantity <=
                  (product.lowStockThreshold || 5)
                ? "low-stock"
                : "in-stock",
          history: [
            {
              type: "sale",
              quantity: -item.quantity,
              previousQuantity: product.totalStock,
              newQuantity: product.totalStock - item.quantity,
              reason: `Order ${orderNumber}`,
              reference: { id: order._id, type: "order" },
              performedBy: user._id,
              date: new Date(),
            },
          ],
        });
        await inventory.save();
      } else {
        await inventory.deductStock(
          item.quantity,
          `Order ${orderNumber}`,
          { id: order._id, type: "order" },
          user._id,
        );
      }
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: user._id, status: "active" },
      {
        $set: {
          status: "converted",
          convertedAt: new Date(),
          convertedToOrder: order._id,
        },
      },
    );

    // Update user stats
    user.orderCount += 1;
    user.totalSpent += total;

    const pointsEarned = Math.floor(total / 100);
    await user.addLoyaltyPoints(pointsEarned, order._id);

    if (!customerPhone || !user.phone || user.phone === customerPhone) {
      await user.save();
    }

    // Generate invoice
    const invoiceUrl = await invoiceService.generateInvoice(order);
    order.invoiceUrl = invoiceUrl;
    await order.save();

    // ✅ SEND ORDER CONFIRMATION EMAIL
    try {
      await emailService.sendOrderConfirmation(order, user);
      console.log(`✅ Order confirmation email sent to ${user.email}`);
    } catch (error) {
      console.error("❌ Order confirmation email failed:", error.message);
    }

    // ✅ SEND ORDER CONFIRMATION WHATSAPP
    try {
      const whatsappService = require("../services/whatsappService");
      await whatsappService.sendOrderConfirmation(order, user);
      console.log(`✅ WhatsApp confirmation sent to ${finalPhone}`);
    } catch (error) {
      console.error("❌ WhatsApp confirmation failed:", error.message);
    }

    // ✅ SEND ADMIN NOTIFICATION
    try {
      await emailService.sendAdminNotification(
        "🛍️ New Order Placed",
        `Order #${orderNumber} has been placed by ${user.name}`,
        {
          orderId: order._id,
          orderNumber: orderNumber,
          customer: user.name,
          email: user.email,
          phone: finalPhone,
          total: total,
          items: items.length,
        },
      );
    } catch (error) {
      console.error("❌ Admin notification email failed:", error.message);
    }

    // Send SMS notification
    try {
      await smsService.sendOrderConfirmation(order, user);
    } catch (error) {
      console.error("❌ Order confirmation SMS failed:", error.message);
    }

    // Create in-app notification
    await Notification.create({
      user: user._id,
      type: "order",
      subtype: "order-confirmation",
      title: "Order Confirmed!",
      message: `Your order #${order.orderNumber} has been confirmed.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
      },
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
      priority: "high",
    });

    // Track analytics
    await Analytics.track({
      type: "order",
      user: user._id,
      reference: { model: "Order", id: order._id },
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderTotal: order.total,
        paymentMethod: order.paymentMethod,
      },
      isConversion: true,
      conversionValue: order.total,
      conversionType: "order",
      source: order.source,
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        invoiceUrl,
        pointsEarned,
      },
      message:
        "Order created successfully! Check your email and WhatsApp for confirmation.",
    });
  } catch (error) {
    console.error("❌ Create order error:", error);
    next(error);
  }
};

/**
 * Get user orders
 */
exports.getUserOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const result = await Order.getUserOrders(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order
 */
exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    }).populate("items.product");

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    if (!order.canCancel) {
      throw new AppError(
        "Order cannot be cancelled at current status",
        400,
        "CANCELLATION_NOT_ALLOWED",
      );
    }

    await order.cancelOrder(reason || "Cancelled by customer");

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { totalStock: item.quantity },
      });

      await Inventory.findOneAndUpdate(
        { product: item.product },
        {
          $inc: { quantity: item.quantity },
          $push: {
            history: {
              type: "cancellation",
              quantity: item.quantity,
              reason: `Order cancelled: ${order.orderNumber}`,
              reference: { id: order._id, type: "order" },
            },
          },
        },
      );
    }

    // Send notification
    await Notification.create({
      user: order.user,
      type: "order",
      subtype: "order-cancelled",
      title: "Order Cancelled",
      message: `Your order #${order.orderNumber} has been cancelled.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason,
      },
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
    });

    res.status(200).json({
      success: true,
      data: { order },
      message: "Order cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track order
 */
exports.trackOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const tracking = {
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      tracking: order.tracking,
      estimatedDelivery: order.expectedDelivery,
      currentStep: order.statusHistory.length - 1,
      totalSteps: Object.keys(ORDER_STATUS).length,
      isDelivered: order.isDelivered,
      isCancelled: order.isCancelled,
    };

    res.status(200).json({
      success: true,
      data: { tracking },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ORDER CONTROLLERS
// ==========================================

/**
 * Get all orders (Admin)
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
        { "customer.email": { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ Use lean() to avoid virtual field issues
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate({
          path: "user",
          select: "name email phone",
          options: { lean: true }, // ✅ Use lean for populate
        })
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // ✅ Use lean() to get plain objects
      Order.countDocuments(query),
    ]);

    console.log(`📊 Admin fetched ${orders.length} orders (total: ${total})`);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ Get all orders error:", error);
    next(error);
  }
};

/**
 * Get single order (Admin)
 */
/**
 * Get single order (Admin) - WITH STATUS HISTORY
 */
exports.getOrderAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate({
        path: "user",
        select: "name email phone loyaltyTier",
        options: { lean: true },
      })
      .populate({
        path: "items.product",
        select: "name brand price images",
        options: { lean: true },
      })
      .populate({
        path: "statusHistory.updatedBy", // ✅ Populate the user who updated status
        select: "name email role",
        options: { lean: true },
      })
      .lean();

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new AppError("Invalid order status", 400, "INVALID_STATUS");
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    await order.updateStatus(status, note, req.user.id);

    // Send notification to user
    await Notification.create({
      user: order.user,
      type: "order",
      subtype: "order-update",
      title: `Order Status Updated: ${status}`,
      message: `Your order #${order.orderNumber} is now ${status}.${note ? ` Note: ${note}` : ""}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status,
        note,
      },
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
    });

    // Send email if status is shipped or delivered
    if (status === ORDER_STATUS.SHIPPED) {
      await emailService
        .sendShippingConfirmation(order)
        .catch((err) => console.error("Email error:", err));
    } else if (status === ORDER_STATUS.DELIVERED) {
      await emailService
        .sendDeliveryConfirmation(order)
        .catch((err) => console.error("Email error:", err));
    }

    res.status(200).json({
      success: true,
      data: { order },
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update tracking (Admin)
 */
exports.updateTracking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingNumber, provider, url } = req.body;

    if (!trackingNumber || !provider) {
      throw new AppError(
        "Tracking number and provider are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    await order.updateTracking(trackingNumber, provider, url);

    // Send notification
    await Notification.create({
      user: order.user,
      type: "shipping",
      subtype: "shipping-confirmation",
      title: "Order Shipped!",
      message: `Your order #${order.orderNumber} has been shipped via ${provider}. Tracking: ${trackingNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber,
        provider,
        trackingUrl: order.tracking.url,
      },
      action: {
        label: "Track Order",
        url: `/orders/${order._id}/track`,
      },
      priority: "high",
    });

    res.status(200).json({
      success: true,
      data: { order },
      message: "Tracking information updated",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add tracking update (Admin)
 */
exports.addTrackingUpdate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, location, description } = req.body;

    if (!status || !description) {
      throw new AppError(
        "Status and description are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    await order.addTrackingUpdate(status, location, description);

    res.status(200).json({
      success: true,
      data: { order },
      message: "Tracking update added",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get order statistics (Admin)
 */
exports.getOrderStats = async (req, res, next) => {
  try {
    const stats = await Order.getOrderStats();
    const dailyOrders = await Order.getDailyOrders(30);

    res.status(200).json({
      success: true,
      data: {
        stats,
        dailyOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate invoice (Admin)
 */
exports.generateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    const invoiceUrl = await invoiceService.generateInvoice(order);

    // Update order
    order.invoiceUrl = invoiceUrl;
    await order.save();

    res.status(200).json({
      success: true,
      data: { invoiceUrl },
      message: "Invoice generated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// orderController.js - Add this new function

/**
 * Confirm payment manually (Admin)
 * For COD orders where cash was collected
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, note, paymentMethod } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    // ✅ Check if order is already paid
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new AppError("Order is already paid", 400, "ALREADY_PAID");
    }

    // ✅ Only allow for COD or pending payment methods
    if (order.paymentMethod !== "cod" && order.paymentStatus !== "pending") {
      throw new AppError(
        "Only COD orders or pending payments can be confirmed manually",
        400,
        "INVALID_PAYMENT_METHOD",
      );
    }

    // ✅ Update payment status
    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.paymentDetails.paidAt = new Date();
    order.paymentDetails.gateway = "manual";
    order.paymentDetails.gatewayResponse = {
      confirmedBy: req.user.id,
      confirmedByEmail: req.user.email,
      confirmedAt: new Date(),
      amount: amount || order.total,
      note: note || "Payment confirmed manually (COD)",
      method: paymentMethod || order.paymentMethod,
    };

    await order.save();

    // ✅ Send notification to user
    await Notification.create({
      user: order.user,
      type: "payment",
      subtype: "payment-confirmation",
      title: "Payment Confirmed!",
      message: `Your payment for order #${order.orderNumber} has been confirmed.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: amount || order.total,
        paymentMethod: order.paymentMethod,
      },
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
      priority: "high",
    });

    // ✅ Send email confirmation
    try {
      await emailService.sendPaymentConfirmation(order);
    } catch (error) {
      console.error("❌ Payment confirmation email failed:", error.message);
    }

    // ✅ Track analytics
    await Analytics.track({
      type: "payment",
      user: order.user,
      reference: { model: "Order", id: order._id },
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: amount || order.total,
        paymentMethod: order.paymentMethod,
        confirmedBy: req.user.email,
      },
      conversionValue: amount || order.total,
      conversionType: "payment-confirmation",
    });

    res.status(200).json({
      success: true,
      data: { order },
      message: `Payment confirmed successfully for order #${order.orderNumber}`,
    });
  } catch (error) {
    console.error("❌ Confirm payment error:", error);
    next(error);
  }
};

/**
 * Mark payment as failed (Admin)
 */
exports.markPaymentFailed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new AppError("Order is already paid", 400, "ALREADY_PAID");
    }

    order.paymentStatus = PAYMENT_STATUS.FAILED;
    order.paymentDetails.gatewayResponse = {
      failedAt: new Date(),
      failedBy: req.user.id,
      reason: reason || "Payment failed",
    };

    await order.save();

    res.status(200).json({
      success: true,
      data: { order },
      message: `Payment marked as failed for order #${order.orderNumber}`,
    });
  } catch (error) {
    next(error);
  }
};
