/**
 * Payment Controller
 * Payment processing
 */

const { AppError } = require("../middleware/errorHandler");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { PAYMENT_STATUS, PAYMENT_METHODS } = require("../config/constants");

/**
 * Initiate payment
 */
exports.initiatePayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.body;

    if (!orderId || !paymentMethod) {
      throw new AppError(
        "Order ID and payment method are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new AppError("Order already paid", 400, "ALREADY_PAID");
    }

    let paymentResponse = {};

    switch (paymentMethod) {
      case PAYMENT_METHODS.COD:
        // Cash on Delivery - no processing needed
        paymentResponse = {
          success: true,
          method: "cod",
          message: "Cash on Delivery selected",
        };
        break;

      case PAYMENT_METHODS.BANK_TRANSFER:
        // Bank Transfer - provide instructions
        paymentResponse = {
          success: true,
          method: "bank-transfer",
          bankDetails: {
            accountTitle: "Elegance Perfumes",
            accountNumber: "1234-567890-01",
            bankName: "HBL",
            branchCode: "1234",
            iban: "PK12HBL0123456789012345",
            swiftCode: "HBLPKKA",
          },
          instructions: [
            "Transfer the exact amount to the account above",
            "Use order number as reference",
            "Upload transfer receipt in the order details",
            "Order will be processed after payment confirmation",
          ],
        };
        break;

      case PAYMENT_METHODS.JAZZCASH:
        // JazzCash integration
        paymentResponse = {
          success: true,
          method: "jazzcash",
          redirectUrl: "https://sandbox.jazzcash.com.pk/payment",
          merchantId: process.env.JAZZCASH_MERCHANT_ID,
          orderReference: order.orderNumber,
          amount: order.total,
        };
        break;

      case PAYMENT_METHODS.EASYPAISA:
        // EasyPaisa integration
        paymentResponse = {
          success: true,
          method: "easypaisa",
          redirectUrl: "https://sandbox.easypaisa.com.pk/payment",
          merchantId: process.env.EASYPAISA_MERCHANT_ID,
          orderReference: order.orderNumber,
          amount: order.total,
        };
        break;

      default:
        throw new AppError(
          "Unsupported payment method",
          400,
          "UNSUPPORTED_METHOD",
        );
    }

    // Update order with payment method
    order.paymentMethod = paymentMethod;
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        paymentMethod,
        paymentResponse,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify payment
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, transactionId, paymentMethod } = req.body;

    if (!orderId || !transactionId) {
      throw new AppError(
        "Order ID and transaction ID are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    // Verify payment based on method
    let isVerified = false;
    let paymentDetails = {};

    switch (paymentMethod || order.paymentMethod) {
      case PAYMENT_METHODS.COD:
        isVerified = true;
        break;

      case PAYMENT_METHODS.BANK_TRANSFER:
        // Manual verification - admin will confirm
        isVerified = true;
        paymentDetails = {
          transactionId,
          bankTransferReference: transactionId,
        };
        break;

      case PAYMENT_METHODS.JAZZCASH:
        // JazzCash verification
        // Implementation depends on JazzCash API
        isVerified = true;
        paymentDetails = {
          transactionId,
          gateway: "jazzcash",
          gatewayResponse: req.body,
        };
        break;

      default:
        isVerified = false;
    }

    if (isVerified) {
      await order.updatePayment(PAYMENT_STATUS.PAID, transactionId);

      // Send notification
      await Notification.create({
        user: order.user,
        type: "payment",
        subtype: "payment-success",
        title: "Payment Successful",
        message: `Payment of PKR ${order.total} for order #${order.orderNumber} has been confirmed.`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.total,
          transactionId,
        },
        action: {
          label: "View Order",
          url: `/orders/${order._id}`,
        },
        priority: "high",
      });

      res.status(200).json({
        success: true,
        data: {
          order,
          paymentStatus: PAYMENT_STATUS.PAID,
        },
        message: "Payment verified successfully",
      });
    } else {
      throw new AppError(
        "Payment verification failed",
        400,
        "VERIFICATION_FAILED",
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Handle payment webhook (Admin/Public)
 */
exports.paymentWebhook = async (req, res, next) => {
  try {
    const { event, data } = req.body;

    // Validate webhook signature
    const signature = req.headers["x-webhook-signature"];
    // Implementation depends on payment gateway

    switch (event) {
      case "payment.success":
        await handlePaymentSuccess(data);
        break;

      case "payment.failed":
        await handlePaymentFailed(data);
        break;

      case "payment.refunded":
        await handlePaymentRefunded(data);
        break;

      default:
        console.log("Unknown webhook event:", event);
    }

    res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process refund (Admin)
 */
exports.processRefund = async (req, res, next) => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId || !amount || parseFloat(amount) <= 0) {
      throw new AppError(
        "Order ID and valid amount are required",
        400,
        "MISSING_FIELDS",
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
    }

    if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
      throw new AppError("Order is not paid", 400, "NOT_PAID");
    }

    if (parseFloat(amount) > order.total) {
      throw new AppError(
        "Refund amount exceeds order total",
        400,
        "INVALID_AMOUNT",
      );
    }

    // Process refund based on payment method
    let refundSuccess = false;

    switch (order.paymentMethod) {
      case PAYMENT_METHODS.COD:
        refundSuccess = true;
        break;

      case PAYMENT_METHODS.BANK_TRANSFER:
        refundSuccess = true;
        break;

      case PAYMENT_METHODS.JAZZCASH:
        // JazzCash refund implementation
        refundSuccess = true;
        break;

      default:
        refundSuccess = false;
    }

    if (refundSuccess) {
      order.paymentStatus = PAYMENT_STATUS.REFUNDED;
      order.paymentDetails.refundedAt = new Date();
      order.refundAmount = parseFloat(amount);
      order.refundStatus = "completed";
      await order.save();

      // Send notification
      await Notification.create({
        user: order.user,
        type: "payment",
        subtype: "payment-refund",
        title: "Refund Processed",
        message: `Refund of PKR ${amount} for order #${order.orderNumber} has been processed.`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount,
          reason,
        },
        action: {
          label: "View Order",
          url: `/orders/${order._id}`,
        },
        priority: "high",
      });

      res.status(200).json({
        success: true,
        data: { order },
        message: "Refund processed successfully",
      });
    } else {
      throw new AppError("Refund processing failed", 400, "REFUND_FAILED");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment methods
 */
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const methods = [
      {
        id: PAYMENT_METHODS.COD,
        name: "Cash on Delivery",
        description: "Pay when you receive your order",
        icon: "cash",
        enabled: true,
      },
      {
        id: PAYMENT_METHODS.BANK_TRANSFER,
        name: "Bank Transfer",
        description: "Transfer payment to our bank account",
        icon: "bank",
        enabled: true,
      },
      {
        id: PAYMENT_METHODS.JAZZCASH,
        name: "JazzCash",
        description: "Pay using JazzCash wallet",
        icon: "jazzcash",
        enabled: true,
      },
      {
        id: PAYMENT_METHODS.EASYPAISA,
        name: "EasyPaisa",
        description: "Pay using EasyPaisa wallet",
        icon: "easypaisa",
        enabled: true,
      },
    ];

    res.status(200).json({
      success: true,
      data: { methods },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment history
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({
      user: req.user.id,
      paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] },
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select("orderNumber total paymentMethod paymentStatus createdAt");

    const total = await Order.countDocuments({
      user: req.user.id,
      paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] },
    });

    res.status(200).json({
      success: true,
      data: {
        payments: orders,
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

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data) {
  const order = await Order.findOne({ orderNumber: data.orderReference });
  if (!order) return;

  await order.updatePayment(PAYMENT_STATUS.PAID, data.transactionId);

  await Notification.create({
    user: order.user,
    type: "payment",
    subtype: "payment-success",
    title: "Payment Successful",
    message: `Payment for order #${order.orderNumber} has been confirmed.`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.total,
    },
    priority: "high",
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data) {
  const order = await Order.findOne({ orderNumber: data.orderReference });
  if (!order) return;

  await order.updatePayment(PAYMENT_STATUS.FAILED);

  await Notification.create({
    user: order.user,
    type: "payment",
    subtype: "payment-failed",
    title: "Payment Failed",
    message: `Payment for order #${order.orderNumber} failed. Please try again.`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      error: data.error,
    },
    priority: "high",
  });
}

/**
 * Handle refunded payment
 */
async function handlePaymentRefunded(data) {
  const order = await Order.findOne({ orderNumber: data.orderReference });
  if (!order) return;

  order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  order.paymentDetails.refundedAt = new Date();
  order.refundAmount = data.amount;
  order.refundStatus = "completed";
  await order.save();

  await Notification.create({
    user: order.user,
    type: "payment",
    subtype: "payment-refund",
    title: "Payment Refunded",
    message: `Your payment of PKR ${data.amount} for order #${order.orderNumber} has been refunded.`,
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: data.amount,
    },
    priority: "high",
  });
}
