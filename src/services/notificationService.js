/**
 * Notification Service
 * Unified notification handling across channels
 */

const EmailService = require("./emailService");
const SmsService = require("./smsService");
const Notification = require("../models/Notification");
const logger = require("../middleware/logger");

class NotificationService {
  constructor() {
    this.emailService = EmailService;
    this.smsService = SmsService;
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification({
    user,
    type,
    subtype,
    title,
    message,
    data = {},
    channels = ["inApp", "email", "sms"],
    priority = "medium",
    expiresAt = null,
    action = null,
  }) {
    try {
      const results = {
        inApp: false,
        email: false,
        sms: false,
        errors: [],
      };

      // Always send in-app notification
      if (channels.includes("inApp")) {
        try {
          await Notification.create({
            user: user._id,
            type,
            subtype,
            title,
            message,
            data,
            action,
            priority,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            channels: {
              inApp: { sent: true, sentAt: new Date() },
            },
          });
          results.inApp = true;
        } catch (error) {
          results.errors.push(`InApp: ${error.message}`);
          logger.error("In-app notification failed", {
            userId: user._id,
            error: error.message,
          });
        }
      }

      // Send email notification
      if (channels.includes("email") && user.email) {
        try {
          await this.sendEmailNotification(
            user,
            type,
            subtype,
            title,
            message,
            data,
          );
          results.email = true;
        } catch (error) {
          results.errors.push(`Email: ${error.message}`);
          logger.error("Email notification failed", {
            userId: user._id,
            error: error.message,
          });
        }
      }

      // Send SMS notification
      if (channels.includes("sms") && user.phone) {
        try {
          await this.sendSmsNotification(user, type, title, message, data);
          results.sms = true;
        } catch (error) {
          results.errors.push(`SMS: ${error.message}`);
          logger.error("SMS notification failed", {
            userId: user._id,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error("Notification sending failed", {
        userId: user._id,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(user, type, subtype, title, message, data) {
    const emailMethods = {
      "order-confirmation": () =>
        this.emailService.sendOrderConfirmation(data.order, user),
      "order-update": () =>
        this.emailService.sendOrderStatusUpdate(
          data.order,
          user,
          data.oldStatus,
          data.newStatus,
        ),
      "shipping-confirmation": () =>
        this.emailService.sendShippingConfirmation(data.order),
      "delivery-confirmation": () =>
        this.emailService.sendDeliveryConfirmation(data.order),
      "payment-success": () =>
        this.emailService.sendOrderConfirmation(data.order, user),
      "payment-failed": () =>
        this.emailService.sendOrderConfirmation(data.order, user),
      "password-reset": () =>
        this.emailService.sendPasswordResetEmail(user, data.token),
      verification: () =>
        this.emailService.sendVerificationEmail(user, data.token),
      welcome: () => this.emailService.sendWelcomeEmail(user),
      "review-request": () =>
        this.emailService.sendReviewRequestEmail(
          user,
          data.product,
          data.order,
        ),
      "abandoned-cart": () =>
        this.emailService.sendAbandonedCartEmail(user, data.cart, data.type),
      "password-changed": () =>
        this.emailService.sendPasswordChangedEmail(user),
      promotion: () =>
        this.emailService.sendPromotionalEmail(user, title, message),
      birthday: () =>
        this.emailService.sendPromotionalEmail(
          user,
          "Happy Birthday!",
          message,
        ),
      "loyalty-update": () =>
        this.emailService.sendPromotionalEmail(
          user,
          "Loyalty Tier Update",
          message,
        ),
    };

    const method = emailMethods[subtype] || emailMethods[type];

    if (method) {
      return await method();
    }

    // Fallback to generic email
    return await this.emailService.sendEmail({
      to: user.email,
      subject: title,
      template: "generic",
      templateData: {
        name: user.name,
        title,
        message,
        data,
      },
    });
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(user, type, title, message, data) {
    const smsMethods = {
      "order-confirmation": () =>
        this.smsService.sendOrderConfirmation(data.order, user),
      "order-shipped": () =>
        this.smsService.sendOrderStatusUpdate(data.order, user, "shipped"),
      "order-delivered": () =>
        this.smsService.sendOrderStatusUpdate(data.order, user, "delivered"),
      "order-cancelled": () =>
        this.smsService.sendOrderStatusUpdate(data.order, user, "cancelled"),
      verification: () =>
        this.smsService.sendVerificationCode(user.phone, data.code, user.name),
      "password-reset": () =>
        this.smsService.sendPasswordResetSMS(
          user.phone,
          user.name,
          data.resetUrl,
        ),
      welcome: () => this.smsService.sendWelcomeSMS(user.phone, user.name),
      "abandoned-cart": () =>
        this.smsService.sendAbandonedCartSMS(user, data.cart, data.discount),
      birthday: () => this.smsService.sendBirthdaySMS(user.phone, user.name),
      "loyalty-update": () =>
        this.smsService.sendLoyaltyUpdateSMS(user, data.tier, data.benefits),
    };

    const method = smsMethods[type];

    if (method) {
      return await method();
    }

    // Fallback to generic SMS
    return await this.smsService.sendSMS({
      to: user.phone,
      message: `${title}: ${message}`,
    });
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(order, user) {
    return this.sendNotification({
      user,
      type: "order",
      subtype: "order-confirmation",
      title: "Order Confirmed!",
      message: `Your order #${order.orderNumber} has been confirmed. Total: PKR ${order.total}`,
      data: { order },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
    });
  }

  /**
   * Send order status update
   */
  async sendOrderStatusUpdate(order, user, oldStatus, newStatus) {
    const statusMessages = {
      confirmed: "Your order has been confirmed and is being processed.",
      packed: "Your order has been packed and is ready for shipping.",
      shipped: "Your order has been shipped and is on its way.",
      delivered: "Your order has been delivered. Enjoy your purchase!",
      cancelled: "Your order has been cancelled.",
    };

    return this.sendNotification({
      user,
      type: "order",
      subtype: "order-update",
      title: `Order Status Update: ${newStatus}`,
      message:
        statusMessages[newStatus] ||
        `Your order #${order.orderNumber} is now ${newStatus}.`,
      data: { order, oldStatus, newStatus },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
    });
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(order, user) {
    return this.sendNotification({
      user,
      type: "payment",
      subtype: "payment-success",
      title: "Payment Successful",
      message: `Your payment of PKR ${order.total} for order #${order.orderNumber} has been confirmed.`,
      data: { order },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "View Order",
        url: `/orders/${order._id}`,
      },
    });
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(order, user, error) {
    return this.sendNotification({
      user,
      type: "payment",
      subtype: "payment-failed",
      title: "Payment Failed",
      message: `Payment for order #${order.orderNumber} failed. ${error || "Please try again."}`,
      data: { order, error },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "Retry Payment",
        url: `/orders/${order._id}/payment`,
      },
    });
  }

  /**
   * Send abandoned cart reminder
   */
  async sendAbandonedCartReminder(user, cart, type = "initial") {
    const discountMap = {
      initial: "5%",
      reminder: "10%",
      final: "15%",
    };

    const titleMap = {
      initial: "You left something in your cart!",
      reminder: "Don't forget your favorite perfumes!",
      final: "Final chance - Your cart is waiting!",
    };

    return this.sendNotification({
      user,
      type: "cart",
      subtype: "abandoned-cart",
      title: titleMap[type] || titleMap.initial,
      message: `Complete your order now and get ${discountMap[type] || "5%"} off!`,
      data: { cart, type, discount: discountMap[type] || "5%" },
      channels: ["inApp", "email", "sms"],
      priority: "medium",
      action: {
        label: "View Cart",
        url: "/cart",
      },
    });
  }

  /**
   * Send welcome notification
   */
  async sendWelcomeNotification(user) {
    return this.sendNotification({
      user,
      type: "system",
      subtype: "welcome",
      title: "Welcome to Elegance Perfumes!",
      message:
        "Thank you for joining us. Enjoy 10% off your first order with code: WELCOME10",
      data: { coupon: "WELCOME10" },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "Start Shopping",
        url: "/shop",
      },
    });
  }

  /**
   * Send loyalty tier update
   */
  async sendLoyaltyTierUpdate(user, oldTier, newTier) {
    const benefits = {
      bronze: "5% off on all orders",
      silver: "10% off + Free shipping",
      gold: "15% off + Free shipping + Priority delivery",
      platinum:
        "20% off + Free shipping + Priority delivery + Exclusive previews",
    };

    return this.sendNotification({
      user,
      type: "loyalty",
      subtype: "loyalty-update",
      title: `Congratulations! You're now ${newTier} Tier!`,
      message: `You've been upgraded from ${oldTier} to ${newTier}. Enjoy ${benefits[newTier]}`,
      data: { oldTier, newTier, benefits: benefits[newTier] },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "View Benefits",
        url: "/account/loyalty",
      },
    });
  }

  /**
   * Send birthday notification
   */
  async sendBirthdayNotification(user) {
    return this.sendNotification({
      user,
      type: "promotion",
      subtype: "birthday",
      title: "🎂 Happy Birthday! 🎂",
      message:
        "Celebrate your special day with 20% off on your entire order! Use code: BIRTHDAY20",
      data: { coupon: "BIRTHDAY20", discount: "20%" },
      channels: ["inApp", "email", "sms"],
      priority: "high",
      action: {
        label: "Shop Now",
        url: "/shop",
      },
    });
  }

  /**
   * Send admin alert notification
   */
  async sendAdminAlert(subject, message, data = {}) {
    // Find all admin users
    const User = require("../models/User");
    const admins = await User.find({ role: "admin", status: "active" });

    const promises = admins.map((admin) =>
      this.sendNotification({
        user: admin,
        type: "admin",
        subtype: "admin-alert",
        title: subject,
        message,
        data,
        channels: ["inApp", "email"],
        priority: "urgent",
      }),
    );

    return Promise.all(promises);
  }
}

// Export singleton instance
module.exports = new NotificationService();
