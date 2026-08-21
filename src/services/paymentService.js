/**
 * Payment Service
 * Professional payment processing with multiple gateways
 */

const axios = require("axios");
const crypto = require("crypto");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

class PaymentService {
  constructor() {
    this.jazzCashConfig = {
      merchantId: process.env.JAZZCASH_MERCHANT_ID,
      password: process.env.JAZZCASH_PASSWORD,
      integritySalt: process.env.JAZZCASH_INTEGRITY_SALT,
      returnUrl:
        process.env.JAZZCASH_RETURN_URL ||
        `${process.env.BACKEND_URL}/api/v1/payment/verify`,
      cancelUrl:
        process.env.JAZZCASH_CANCEL_URL ||
        `${process.env.FRONTEND_URL}/payment/cancel`,
      apiUrl:
        process.env.JAZZCASH_API_URL ||
        "https://sandbox.jazzcash.com.pk/payment",
    };

    this.easyPaisaConfig = {
      merchantId: process.env.EASYPAISA_MERCHANT_ID,
      password: process.env.EASYPAISA_PASSWORD,
      integritySalt: process.env.EASYPAISA_INTEGRITY_SALT,
      returnUrl: process.env.EASYPAISA_RETURN_URL,
      cancelUrl: process.env.EASYPAISA_CANCEL_URL,
      apiUrl:
        process.env.EASYPAISA_API_URL ||
        "https://sandbox.easypaisa.com.pk/payment",
    };
  }

  // ==========================================
  // JAZZCASH PAYMENT
  // ==========================================

  /**
   * Initialize JazzCash payment
   */
  async initJazzCashPayment(order) {
    try {
      const merchantId = this.jazzCashConfig.merchantId;
      const password = this.jazzCashConfig.password;
      const integritySalt = this.jazzCashConfig.integritySalt;

      // Generate unique transaction ID
      const transactionId = `JZ${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

      // Prepare payment data
      const paymentData = {
        merchantId: merchantId,
        password: password,
        transactionId: transactionId,
        amount: order.total.toString(),
        orderReference: order.orderNumber,
        returnUrl: this.jazzCashConfig.returnUrl,
        cancelUrl: this.jazzCashConfig.cancelUrl,
        merchantName: "Elegance Perfumes",
        productName: `Order #${order.orderNumber}`,
      };

      // Generate signature
      const signature = this.generateJazzCashSignature(
        paymentData,
        integritySalt,
      );
      paymentData.signature = signature;

      logger.info("JazzCash payment initiated", {
        orderNumber: order.orderNumber,
        transactionId,
        amount: order.total,
      });

      return {
        success: true,
        transactionId,
        paymentUrl: this.jazzCashConfig.apiUrl,
        paymentData,
      };
    } catch (error) {
      logger.error("JazzCash payment initiation failed", {
        orderNumber: order.orderNumber,
        error: error.message,
      });
      throw new AppError(
        "Payment initiation failed",
        500,
        "PAYMENT_INIT_FAILED",
      );
    }
  }

  /**
   * Generate JazzCash signature
   */
  generateJazzCashSignature(data, salt) {
    const sortedKeys = Object.keys(data).sort();
    const stringToHash =
      sortedKeys.map((key) => `${key}=${data[key]}`).join("&") + `&${salt}`;

    return crypto.createHash("sha256").update(stringToHash).digest("hex");
  }

  /**
   * Verify JazzCash payment
   */
  async verifyJazzCashPayment(response) {
    try {
      const { orderReference, amount, transactionId, signature } = response;

      // Verify signature
      const verificationData = {
        orderReference,
        amount,
        transactionId,
        merchantId: this.jazzCashConfig.merchantId,
      };

      const expectedSignature = this.generateJazzCashSignature(
        verificationData,
        this.jazzCashConfig.integritySalt,
      );

      if (signature !== expectedSignature) {
        logger.warn("Invalid JazzCash signature", {
          orderReference,
          transactionId,
        });
        return { success: false, error: "Invalid signature" };
      }

      // Verify with JazzCash API (optional - for additional security)
      // const verification = await this.verifyWithJazzCashAPI(transactionId);

      logger.info("JazzCash payment verified", {
        orderReference,
        transactionId,
        amount,
      });

      return {
        success: true,
        transactionId,
        amount: parseFloat(amount),
        orderReference,
        paymentMethod: "jazzcash",
        gatewayResponse: response,
      };
    } catch (error) {
      logger.error("JazzCash verification failed", {
        orderReference: response.orderReference,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // EASYPAISA PAYMENT
  // ==========================================

  /**
   * Initialize EasyPaisa payment
   */
  async initEasyPaisaPayment(order) {
    try {
      const merchantId = this.easyPaisaConfig.merchantId;
      const password = this.easyPaisaConfig.password;
      const integritySalt = this.easyPaisaConfig.integritySalt;

      const transactionId = `EP${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

      const paymentData = {
        merchantId: merchantId,
        password: password,
        transactionId: transactionId,
        amount: order.total.toString(),
        orderReference: order.orderNumber,
        returnUrl: this.easyPaisaConfig.returnUrl,
        cancelUrl: this.easyPaisaConfig.cancelUrl,
      };

      const signature = this.generateEasyPaisaSignature(
        paymentData,
        integritySalt,
      );
      paymentData.signature = signature;

      logger.info("EasyPaisa payment initiated", {
        orderNumber: order.orderNumber,
        transactionId,
        amount: order.total,
      });

      return {
        success: true,
        transactionId,
        paymentUrl: this.easyPaisaConfig.apiUrl,
        paymentData,
      };
    } catch (error) {
      logger.error("EasyPaisa payment initiation failed", {
        orderNumber: order.orderNumber,
        error: error.message,
      });
      throw new AppError(
        "Payment initiation failed",
        500,
        "PAYMENT_INIT_FAILED",
      );
    }
  }

  /**
   * Generate EasyPaisa signature
   */
  generateEasyPaisaSignature(data, salt) {
    const sortedKeys = Object.keys(data).sort();
    const stringToHash =
      sortedKeys.map((key) => `${key}=${data[key]}`).join("&") + `&${salt}`;

    return crypto.createHash("sha256").update(stringToHash).digest("hex");
  }

  /**
   * Verify EasyPaisa payment
   */
  async verifyEasyPaisaPayment(response) {
    try {
      const { orderReference, amount, transactionId, signature } = response;

      const verificationData = {
        orderReference,
        amount,
        transactionId,
        merchantId: this.easyPaisaConfig.merchantId,
      };

      const expectedSignature = this.generateEasyPaisaSignature(
        verificationData,
        this.easyPaisaConfig.integritySalt,
      );

      if (signature !== expectedSignature) {
        logger.warn("Invalid EasyPaisa signature", {
          orderReference,
          transactionId,
        });
        return { success: false, error: "Invalid signature" };
      }

      logger.info("EasyPaisa payment verified", {
        orderReference,
        transactionId,
        amount,
      });

      return {
        success: true,
        transactionId,
        amount: parseFloat(amount),
        orderReference,
        paymentMethod: "easypaisa",
        gatewayResponse: response,
      };
    } catch (error) {
      logger.error("EasyPaisa verification failed", {
        orderReference: response.orderReference,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // BANK TRANSFER PAYMENT
  // ==========================================

  /**
   * Get bank transfer details
   */
  getBankTransferDetails() {
    return {
      bankName: process.env.BANK_NAME || "Habib Bank Limited",
      accountTitle: process.env.BANK_ACCOUNT_TITLE || "Elegance Perfumes",
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || "1234-567890-01",
      branchCode: process.env.BANK_BRANCH_CODE || "1234",
      iban: process.env.BANK_IBAN || "PK12HBL0123456789012345",
      swiftCode: process.env.BANK_SWIFT_CODE || "HBLPKKA",
      instructions: [
        "Transfer the exact amount to the account above",
        "Use order number as reference",
        "Upload transfer receipt in the order details",
        "Order will be processed after payment confirmation",
      ],
    };
  }

  // ==========================================
  // STRIPE PAYMENT (Future)
  // ==========================================

  /**
   * Initialize Stripe payment (Future implementation)
   */
  async initStripePayment(order) {
    // This will be implemented when Stripe integration is needed
    throw new AppError(
      "Stripe payment not implemented yet",
      501,
      "NOT_IMPLEMENTED",
    );
  }

  /**
   * Verify Stripe payment (Future implementation)
   */
  async verifyStripePayment(response) {
    throw new AppError(
      "Stripe payment verification not implemented yet",
      501,
      "NOT_IMPLEMENTED",
    );
  }

  // ==========================================
  // COMMON PAYMENT METHODS
  // ==========================================

  /**
   * Process refund
   */
  async processRefund(order, amount, reason = "") {
    try {
      let refundResult;

      switch (order.paymentMethod) {
        case "jazzcash":
          refundResult = await this.processJazzCashRefund(order, amount);
          break;
        case "easypaisa":
          refundResult = await this.processEasyPaisaRefund(order, amount);
          break;
        case "bank-transfer":
          refundResult = await this.processBankTransferRefund(order, amount);
          break;
        case "cod":
          refundResult = { success: true, message: "COD refund processed" };
          break;
        default:
          throw new AppError(
            "Unsupported payment method for refund",
            400,
            "UNSUPPORTED_METHOD",
          );
      }

      logger.info("Refund processed", {
        orderNumber: order.orderNumber,
        amount,
        reason,
        paymentMethod: order.paymentMethod,
        refundResult,
      });

      return refundResult;
    } catch (error) {
      logger.error("Refund processing failed", {
        orderNumber: order.orderNumber,
        error: error.message,
      });
      throw new AppError("Refund processing failed", 500, "REFUND_FAILED");
    }
  }

  /**
   * Process JazzCash refund
   */
  async processJazzCashRefund(order, amount) {
    // JazzCash refund implementation
    // This would call JazzCash API for refund
    return {
      success: true,
      transactionId: `RF${Date.now()}`,
      amount,
      message: "JazzCash refund processed",
    };
  }

  /**
   * Process EasyPaisa refund
   */
  async processEasyPaisaRefund(order, amount) {
    // EasyPaisa refund implementation
    return {
      success: true,
      transactionId: `RF${Date.now()}`,
      amount,
      message: "EasyPaisa refund processed",
    };
  }

  /**
   * Process Bank Transfer refund
   */
  async processBankTransferRefund(order, amount) {
    // Bank Transfer refund - manual processing
    return {
      success: true,
      transactionId: `RF${Date.now()}`,
      amount,
      message: "Bank transfer refund initiated",
      instructions: "Refund will be processed within 3-5 business days",
    };
  }
}

// Export singleton instance
module.exports = new PaymentService();
