/**
 * SMS Service
 * Professional SMS handling with Twilio
 */

// ✅ TEMPORARY DISABLE - Skip if Twilio not configured
if (
  !process.env.TWILIO_ACCOUNT_SID ||
  !process.env.TWILIO_ACCOUNT_SID.startsWith("AC")
) {
  console.warn("⚠️ Twilio not configured. SMS features disabled.");

  // Create dummy functions that do nothing
  const dummyService = {
    isEnabled: false,
    sendSMS: async () => ({ success: false, message: "SMS service disabled" }),
    sendWelcomeSMS: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendOrderConfirmation: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendOrderStatusUpdate: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendVerificationCode: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendPasswordResetSMS: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendAbandonedCartSMS: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendBirthdaySMS: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendLoyaltyUpdateSMS: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    sendLowStockAlert: async () => ({
      success: false,
      message: "SMS service disabled",
    }),
    formatPhoneNumber: (phone) => phone,
    compileTemplate: () => "",
    sleep: () => {},
  };

  module.exports = dummyService;
  return;
}

const twilio = require("twilio");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

class SMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.isEnabled = !!(this.accountSid && this.authToken && this.phoneNumber);

    if (this.isEnabled) {
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  /**
   * Send SMS with retry logic
   */
  async sendSMS({ to, message, template, templateData }) {
    if (!this.isEnabled) {
      logger.warn("SMS service not configured, skipping send");
      return { success: false, message: "SMS service not configured" };
    }

    const maxRetries = 3;
    let lastError;

    // Format phone number
    const formattedNumber = this.formatPhoneNumber(to);

    // If template is provided, use it
    let finalMessage = message;
    if (template) {
      finalMessage = this.compileTemplate(template, templateData);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.client.messages.create({
          body: finalMessage,
          from: this.phoneNumber,
          to: formattedNumber,
          statusCallback: `${process.env.BACKEND_URL}/api/v1/sms/webhook`,
        });

        logger.info("SMS sent successfully", {
          to: formattedNumber,
          sid: result.sid,
          attempt,
        });

        return { success: true, sid: result.sid, status: result.status };
      } catch (error) {
        lastError = error;
        logger.warn(`SMS attempt ${attempt} failed`, {
          to: formattedNumber,
          error: error.message,
        });

        if (attempt < maxRetries) {
          await this.sleep(1000 * Math.pow(2, attempt));
        }
      }
    }

    logger.error("All SMS attempts failed", {
      to: formattedNumber,
      error: lastError?.message,
    });

    throw new AppError(
      "Failed to send SMS after multiple attempts",
      500,
      "SMS_FAILED",
    );
  }

  /**
   * Format phone number for Twilio
   */
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, "");

    // If number starts with 0, replace with country code
    if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = `+92${cleaned.substring(1)}`;
    }

    // If number doesn't have country code, add +92 for Pakistan
    if (!cleaned.startsWith("+") && cleaned.length === 10) {
      cleaned = `+92${cleaned}`;
    }

    // Ensure number starts with +
    if (!cleaned.startsWith("+")) {
      cleaned = `+${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Compile SMS template
   */
  compileTemplate(template, data) {
    const templates = {
      "order-confirmation": (d) =>
        `Hi ${d.name}, your order #${d.orderNumber} has been confirmed. Amount: PKR ${d.total}. Thank you for shopping at Elegance Perfumes!`,

      "order-shipped": (d) =>
        `Hi ${d.name}, your order #${d.orderNumber} has been shipped. Tracking: ${d.trackingNumber}. Track here: ${d.trackingUrl}`,

      "order-delivered": (d) =>
        `Hi ${d.name}, your order #${d.orderNumber} has been delivered. We hope you enjoy your purchase!`,

      "order-cancelled": (d) =>
        `Hi ${d.name}, your order #${d.orderNumber} has been cancelled. Refund will be processed within 3-5 business days.`,

      verification: (d) =>
        `Hi ${d.name}, your Elegance Perfumes verification code is: ${d.code}. Valid for 10 minutes.`,

      "password-reset": (d) =>
        `Hi ${d.name}, reset your Elegance Perfumes password here: ${d.resetUrl}. Valid for 1 hour.`,

      welcome: (d) =>
        `Hi ${d.name}, welcome to Elegance Perfumes! Enjoy 10% off your first order with code: WELCOME10`,

      "abandoned-cart": (d) =>
        `Hi ${d.name}, you left items in your cart! Complete your order now and get ${d.discount}% off: ${d.cartUrl}`,

      "low-stock": (d) =>
        `Alert: Product "${d.productName}" is running low on stock. Only ${d.currentStock} units remaining.`,

      "review-request": (d) =>
        `Hi ${d.name}, how do you like ${d.productName}? Share your review here: ${d.reviewUrl}`,

      birthday: (d) =>
        `🎂 Happy Birthday ${d.name}! Enjoy a special 20% off on your birthday with code: BIRTHDAY20`,

      "loyalty-update": (d) =>
        `Hi ${d.name}, congratulations! You've reached ${d.tier} tier. Enjoy ${d.benefits}`,
    };

    const templateFn = templates[template];
    if (!templateFn) {
      logger.warn(`SMS template not found: ${template}`);
      return `[${template}] ${JSON.stringify(data)}`;
    }

    return templateFn(data);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================
  // SPECIFIC SMS METHODS
  // ==========================================

  /**
   * Send welcome SMS
   */
  async sendWelcomeSMS(phone, name) {
    return this.sendSMS({
      to: phone,
      template: "welcome",
      templateData: { name },
    });
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmation(order, user) {
    return this.sendSMS({
      to: user.phone,
      template: "order-confirmation",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        total: order.total,
      },
    });
  }

  /**
   * Send order status update SMS
   */
  async sendOrderStatusUpdate(order, user, status) {
    const templates = {
      shipped: "order-shipped",
      delivered: "order-delivered",
      cancelled: "order-cancelled",
    };

    const template = templates[status];
    if (!template) return;

    return this.sendSMS({
      to: user.phone,
      template,
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        trackingNumber: order.tracking?.number,
        trackingUrl: order.tracking?.url,
      },
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(phone, code, name = "User") {
    return this.sendSMS({
      to: phone,
      template: "verification",
      templateData: { name, code },
    });
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSMS(phone, name, resetUrl) {
    return this.sendSMS({
      to: phone,
      template: "password-reset",
      templateData: { name, resetUrl },
    });
  }

  /**
   * Send abandoned cart SMS
   */
  async sendAbandonedCartSMS(user, cart, discount = "10") {
    return this.sendSMS({
      to: user.phone,
      template: "abandoned-cart",
      templateData: {
        name: user.name,
        discount,
        cartUrl: `${process.env.FRONTEND_URL}/cart`,
      },
    });
  }

  /**
   * Send birthday SMS
   */
  async sendBirthdaySMS(phone, name) {
    return this.sendSMS({
      to: phone,
      template: "birthday",
      templateData: { name },
    });
  }

  /**
   * Send loyalty tier update SMS
   */
  async sendLoyaltyUpdateSMS(user, tier, benefits) {
    return this.sendSMS({
      to: user.phone,
      template: "loyalty-update",
      templateData: {
        name: user.name,
        tier,
        benefits,
      },
    });
  }

  /**
   * Send low stock alert (Admin)
   */
  async sendLowStockAlert(product, quantity) {
    const adminPhone = process.env.ADMIN_PHONE || "+923001234567";

    return this.sendSMS({
      to: adminPhone,
      template: "low-stock",
      templateData: {
        productName: product.name,
        currentStock: quantity,
      },
    });
  }
}

// Export singleton instance
module.exports = new SMSService();
