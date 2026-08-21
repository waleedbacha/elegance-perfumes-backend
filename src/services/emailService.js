/**
 * Email Service
 * Professional email handling with Resend/Nodemailer
 */

const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const path = require("path");
const fs = require("fs");
const handlebars = require("handlebars");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates directory
const TEMPLATES_DIR = path.join(__dirname, "../templates/email");

class EmailService {
  constructor() {
    this.fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    this.fromName = process.env.RESEND_FROM_NAME || "Elegance Perfumes";
    this.useResend = !!process.env.RESEND_API_KEY;

    // Create transporter for Nodemailer fallback
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email with retry logic
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
    template,
    templateData,
    attachments = [],
  }) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // If template is provided, compile it
        let emailHtml = html;
        if (template) {
          emailHtml = await this.compileTemplate(template, templateData);
        }

        const emailData = {
          from: `${this.fromName} <${this.fromEmail}>`,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: emailHtml || text,
          text: text || (emailHtml ? await this.htmlToText(emailHtml) : ""),
          attachments: attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            path: att.path,
          })),
        };

        let result;

        // Send via Resend or Nodemailer
        if (this.useResend) {
          result = await resend.emails.send(emailData);
          logger.info("📧 Email sent via Resend", {
            to: Array.isArray(to) ? to.join(",") : to,
            subject,
            id: result.id,
          });
        } else {
          result = await this.transporter.sendMail({
            from: `"${this.fromName}" <${this.fromEmail}>`,
            to: Array.isArray(to) ? to.join(", ") : to,
            subject,
            html: emailData.html,
            text: emailData.text,
            attachments: emailData.attachments,
          });
          logger.info("📧 Email sent via Nodemailer", {
            to: Array.isArray(to) ? to.join(",") : to,
            subject,
            messageId: result.messageId,
          });
        }

        return { success: true, result };
      } catch (error) {
        lastError = error;
        logger.warn(`⚠️ Email attempt ${attempt} failed`, {
          to: Array.isArray(to) ? to.join(",") : to,
          subject,
          error: error.message,
        });

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await this.sleep(1000 * Math.pow(2, attempt));
        }
      }
    }

    logger.error("❌ All email attempts failed", {
      to: Array.isArray(to) ? to.join(",") : to,
      subject,
      error: lastError?.message,
    });

    throw new AppError(
      "Failed to send email after multiple attempts",
      500,
      "EMAIL_FAILED",
    );
  }

  /**
   * Compile Handlebars template
   */
  async compileTemplate(templateName, data) {
    try {
      const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template ${templateName} not found`);
      }

      const templateContent = fs.readFileSync(templatePath, "utf8");
      const compiledTemplate = handlebars.compile(templateContent);

      return compiledTemplate({
        ...data,
        year: new Date().getFullYear(),
        siteName: "Elegance Perfumes",
        siteUrl: process.env.FRONTEND_URL || "http://localhost:3000",
        supportEmail: "elegance.myperfume@gmail.com",
        privacyUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/privacy`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/unsubscribe`,
        shopUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/shop`,
        loginUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login`,
      });
    } catch (error) {
      logger.error("❌ Template compilation failed", {
        templateName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Convert HTML to plain text
   */
  async htmlToText(html) {
    try {
      const { convert } = require("html-to-text");
      return convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
        ],
      });
    } catch (error) {
      // If html-to-text is not installed, just strip tags
      return html ? html.replace(/<[^>]*>/g, "").trim() : "";
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================
  // SPECIFIC EMAIL METHODS
  // ==========================================

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: "Welcome to Elegance Perfumes!",
      template: "welcome",
      templateData: {
        name: user.name,
        email: user.email,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email/${user.verificationToken}`,
      },
    });
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user, token) {
    return this.sendEmail({
      to: user.email,
      subject: "Verify Your Email Address",
      template: "verification",
      templateData: {
        name: user.name,
        verificationUrl: `${process.env.FRONTEND_URL}/verify-email/${token}`,
        expiresIn: "24 hours",
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token) {
    return this.sendEmail({
      to: user.email,
      subject: "Reset Your Password",
      template: "password-reset",
      templateData: {
        name: user.name,
        resetUrl: `${process.env.FRONTEND_URL}/reset-password/${token}`,
        expiresIn: "1 hour",
      },
    });
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: "Your Password Has Been Changed",
      template: "password-changed",
      templateData: {
        name: user.name,
        supportUrl: `${process.env.FRONTEND_URL}/contact`,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
        changeTime: new Date().toLocaleString(),
      },
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order, user) {
    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name} ${item.size ? `- ${item.size}` : ""}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${item.price.toLocaleString()}</td>
      </tr>
    `,
      )
      .join("");

    return this.sendEmail({
      to: user.email,
      subject: `Order Confirmation #${order.orderNumber}`,
      template: "order-confirmation",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        items: itemsHtml,
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        shipping: order.shipping || 0,
        tax: order.tax || 0,
        total: order.total || 0,
        paymentMethod: order.paymentMethod || "Credit Card",
        shippingAddress: {
          name: order.shippingAddress?.name || user.name,
          street: order.shippingAddress?.street || "",
          city: order.shippingAddress?.city || "",
          state: order.shippingAddress?.state || "",
          zipCode: order.shippingAddress?.zipCode || "",
          country: order.shippingAddress?.country || "Pakistan",
        },
        orderUrl: `${process.env.FRONTEND_URL}/orders/${order._id}`,
      },
    });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(order, user, oldStatus, newStatus) {
    const statusMessages = {
      confirmed: "Your order has been confirmed and is being processed.",
      packed: "Your order has been packed and is ready for shipping.",
      shipped: "Your order has been shipped and is on its way to you.",
      delivered: "Your order has been delivered. We hope you love it!",
      cancelled: "Your order has been cancelled.",
      refunded: "Your order has been refunded.",
    };

    return this.sendEmail({
      to: user.email,
      subject: `Order #${order.orderNumber} Status Update: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      template: "order-status-update",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        oldStatus,
        newStatus,
        message:
          statusMessages[newStatus] ||
          `Your order status has been updated to ${newStatus}.`,
        orderUrl: `${process.env.FRONTEND_URL}/orders/${order._id}`,
        trackingNumber: order.tracking?.number,
        trackingUrl: order.tracking?.url,
        trackingProvider: order.tracking?.provider,
      },
    });
  }

  /**
   * Send shipping confirmation
   */
  async sendShippingConfirmation(order) {
    const user = await require("../models/User").findById(order.user);
    if (!user) return;

    return this.sendEmail({
      to: user.email,
      subject: `Your Order #${order.orderNumber} Has Been Shipped!`,
      template: "shipping-confirmation",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        trackingNumber: order.tracking?.number,
        trackingProvider: order.tracking?.provider,
        trackingUrl: order.tracking?.url,
        estimatedDelivery: order.tracking?.estimatedDelivery
          ? new Date(order.tracking.estimatedDelivery).toLocaleDateString()
          : "3-5 business days",
        orderUrl: `${process.env.FRONTEND_URL}/orders/${order._id}`,
      },
    });
  }

  /**
   * Send delivery confirmation
   */
  async sendDeliveryConfirmation(order) {
    const user = await require("../models/User").findById(order.user);
    if (!user) return;

    return this.sendEmail({
      to: user.email,
      subject: `Your Order #${order.orderNumber} Has Been Delivered!`,
      template: "delivery-confirmation",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        deliveredAt: order.deliveredAt
          ? new Date(order.deliveredAt).toLocaleDateString()
          : new Date().toLocaleDateString(),
        reviewUrl: `${process.env.FRONTEND_URL}/product/${order.items[0]?.product}/review`,
        orderUrl: `${process.env.FRONTEND_URL}/orders/${order._id}`,
      },
    });
  }

  /**
   * Send abandoned cart email
   */
  async sendAbandonedCartEmail(user, cart, type = "initial") {
    const itemsHtml = cart.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          ${item.name} ${item.size ? `- ${item.size}` : ""}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">PKR ${item.price.toLocaleString()}</td>
      </tr>
    `,
      )
      .join("");

    const subjectMap = {
      initial: "You left something in your cart!",
      reminder: "Don't forget your favorite perfumes!",
      final: "Final chance - Your cart is waiting!",
    };

    const discountMap = {
      initial: "5%",
      reminder: "10%",
      final: "15%",
    };

    return this.sendEmail({
      to: user.email,
      subject: subjectMap[type] || subjectMap.initial,
      template: "abandoned-cart",
      templateData: {
        name: user.name,
        items: itemsHtml,
        subtotal: cart.subtotal || 0,
        discount: discountMap[type] || "5%",
        cartUrl: `${process.env.FRONTEND_URL}/cart`,
        type,
      },
    });
  }

  /**
   * Send review request email
   */
  async sendReviewRequestEmail(user, product, order) {
    return this.sendEmail({
      to: user.email,
      subject: `How do you like ${product.name}?`,
      template: "review-request",
      templateData: {
        name: user.name,
        productName: product.name,
        productImage: product.images?.[0]?.url,
        reviewUrl: `${process.env.FRONTEND_URL}/product/${product._id}/review`,
        orderNumber: order.orderNumber,
      },
    });
  }

  /**
   * Send promotional email
   */
  async sendPromotionalEmail(
    user,
    title,
    content,
    buttonText,
    buttonUrl,
    image,
  ) {
    return this.sendEmail({
      to: user.email,
      subject: title,
      template: "promotional",
      templateData: {
        name: user.name,
        title,
        content,
        image,
        buttonText,
        buttonUrl,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/unsubscribe/${user._id}`,
      },
    });
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(subject, message, data = {}) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@elegance.pk";

    return this.sendEmail({
      to: adminEmail,
      subject: `[Admin] ${subject}`,
      template: "admin-notification",
      templateData: {
        subject,
        message,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send low stock alert to admin
   */
  async sendLowStockAlert(product, quantity) {
    return this.sendAdminNotification(
      `Low Stock Alert: ${product.name}`,
      `Product "${product.name}" is running low on stock. Only ${quantity} units remaining.`,
      {
        productId: product._id,
        productName: product.name,
        brand: product.brand,
        currentStock: quantity,
        threshold: product.lowStockThreshold || 5,
        url: `${process.env.FRONTEND_URL}/admin/products/${product._id}`,
      },
    );
  }

  /**
   * Send contact form email
   */
  async sendContactFormEmail(name, email, subject, message) {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@elegance.pk";

    return this.sendEmail({
      to: adminEmail,
      subject: `[Contact Form] ${subject}`,
      template: "contact-form",
      templateData: {
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Send order cancellation email
   */
  async sendOrderCancellationEmail(order, user, reason) {
    return this.sendEmail({
      to: user.email,
      subject: `Order #${order.orderNumber} Cancelled`,
      template: "order-cancellation",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        reason: reason || "Requested by customer",
        supportUrl: `${process.env.FRONTEND_URL}/contact`,
      },
    });
  }

  /**
   * Send order refund email
   */
  async sendOrderRefundEmail(order, user, amount) {
    return this.sendEmail({
      to: user.email,
      subject: `Refund Processed for Order #${order.orderNumber}`,
      template: "order-refund",
      templateData: {
        name: user.name,
        orderNumber: order.orderNumber,
        amount: amount || order.total || 0,
        refundDate: new Date().toLocaleDateString(),
        supportUrl: `${process.env.FRONTEND_URL}/contact`,
      },
    });
  }

  /**
   * Test email configuration
   */
  async testEmail() {
    try {
      const result = await this.sendEmail({
        to: process.env.TEST_EMAIL || "your-email@gmail.com",
        subject: "✅ Test Email from Elegance Perfumes",
        html: `
          <h1>✅ Test Email</h1>
          <p>This is a test email from Elegance Perfumes.</p>
          <p>If you're reading this, your email configuration is working!</p>
          <p><strong>Provider:</strong> ${this.useResend ? "Resend" : "Nodemailer"}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${this.fromName} &lt;${this.fromEmail}&gt;</p>
        `,
      });
      return { success: true, result };
    } catch (error) {
      logger.error("❌ Test email failed:", error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
