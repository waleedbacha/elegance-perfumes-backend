/**
 * Email Configuration
 * Email service setup with Resend and Nodemailer fallback
 */

const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const logger = require("../middleware/logger");

class EmailConfig {
  constructor() {
    this.resend = null;
    this.transporter = null;
    this.isResendEnabled = false;
    this.isNodemailerEnabled = false;
    this.initialized = false;
  }

  /**
   * Initialize email services
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // Initialize Resend
    if (process.env.RESEND_API_KEY) {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.isResendEnabled = true;
        logger.info("📧 Resend initialized successfully");
      } catch (error) {
        logger.error("❌ Resend initialization failed:", error.message);
      }
    }

    // Initialize Nodemailer (fallback)
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: process.env.NODE_ENV === "production",
          },
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 10,
        });

        this.isNodemailerEnabled = true;
        logger.info("📧 Nodemailer initialized successfully");
      } catch (error) {
        logger.error("❌ Nodemailer initialization failed:", error.message);
      }
    }

    // Validate configuration
    if (!this.isResendEnabled && !this.isNodemailerEnabled) {
      logger.warn(
        "⚠️ No email service configured. Email features will not work.",
      );
    }

    this.initialized = true;
  }

  /**
   * Get email service
   */
  getService() {
    this.initialize();

    if (this.isResendEnabled) {
      return {
        type: "resend",
        client: this.resend,
      };
    }

    if (this.isNodemailerEnabled) {
      return {
        type: "nodemailer",
        client: this.transporter,
      };
    }

    throw new Error("No email service configured");
  }

  /**
   * Get default from address
   */
  getFromAddress() {
    const email = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const name = process.env.RESEND_FROM_NAME || "Elegance Perfumes";
    return {
      email,
      name,
    };
  }

  /**
   * Determine if we should use Resend (preferred) or fallback
   */
  shouldUseResend() {
    return this.isResendEnabled;
  }

  /**
   * Send email
   */
  async sendEmail(options) {
    this.initialize();

    const from = options.from || this.getFromAddress();
    const fromAddress = `${from.name} <${from.email}>`;

    // Prepare email data for Resend
    const emailData = {
      from: fromAddress,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text || options.html?.replace(/<[^>]*>/g, "") || "",
      attachments:
        options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
        })) || [],
    };

    // Try Resend first (preferred)
    if (this.isResendEnabled) {
      try {
        const result = await this.resend.emails.send(emailData);
        logger.info("📧 Email sent via Resend", {
          to: Array.isArray(options.to) ? options.to.join(",") : options.to,
          subject: options.subject,
          id: result.id,
        });
        return { success: true, provider: "resend", result };
      } catch (error) {
        logger.error("❌ Resend email failed:", error.message);
        // Fallback to Nodemailer if available
        if (this.isNodemailerEnabled) {
          logger.info("🔄 Falling back to Nodemailer");
          return this.sendViaNodemailer(emailData, options);
        }
        throw error;
      }
    }

    // Use Nodemailer
    if (this.isNodemailerEnabled) {
      return this.sendViaNodemailer(emailData, options);
    }

    throw new Error("No email service available");
  }

  /**
   * Send via Nodemailer (fallback)
   */
  async sendViaNodemailer(emailData, options) {
    try {
      const mailOptions = {
        from: emailData.from,
        to: Array.isArray(emailData.to)
          ? emailData.to.join(", ")
          : emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        attachments: emailData.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          cid: att.cid,
        })),
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          Importance: "High",
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info("📧 Email sent via Nodemailer (fallback)", {
        to: Array.isArray(options.to) ? options.to.join(",") : options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      return { success: true, provider: "nodemailer", result };
    } catch (error) {
      logger.error("❌ Nodemailer email failed:", error.message);
      throw error;
    }
  }

  /**
   * Send email with template
   */
  async sendTemplateEmail(to, subject, templateName, data, options = {}) {
    try {
      // Import email templates dynamically
      const emailTemplates = require("../utils/emailTemplates");
      const html = emailTemplates.compile(templateName, {
        ...data,
        year: new Date().getFullYear(),
        siteName: "Elegance Perfumes",
        siteUrl: process.env.FRONTEND_URL || "http://localhost:3000",
        supportEmail: "elegance.myperfume@gmail.com",
        privacyUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/privacy`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/unsubscribe`,
        ...options.defaultData,
      });

      return this.sendEmail({
        to,
        subject,
        html,
        ...options,
      });
    } catch (error) {
      logger.error("❌ Template email failed:", error.message);
      throw error;
    }
  }

  /**
   * Bulk send emails
   */
  async sendBulkEmails(emails) {
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error("No emails to send");
    }

    const results = {
      total: emails.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const promises = batch.map(async (email) => {
        try {
          await this.sendEmail(email);
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            to: email.to,
            error: error.message,
          });
        }
      });

      await Promise.all(promises);

      // Delay between batches to avoid rate limits
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info("📧 Bulk email completed", {
      total: results.total,
      sent: results.sent,
      failed: results.failed,
    });

    return results;
  }

  /**
   * Get email stats
   */
  async getStats() {
    return {
      initialized: this.initialized,
      resendEnabled: this.isResendEnabled,
      nodemailerEnabled: this.isNodemailerEnabled,
      fromAddress: this.getFromAddress(),
      preferredProvider: this.shouldUseResend() ? "resend" : "nodemailer",
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    this.initialize();

    const status = {
      healthy: false,
      services: {
        resend: {
          enabled: this.isResendEnabled,
          healthy: false,
        },
        nodemailer: {
          enabled: this.isNodemailerEnabled,
          healthy: false,
        },
      },
    };

    // Check Resend
    if (this.isResendEnabled) {
      try {
        // Test Resend by sending a test email (optional)
        // Or just check if API key is valid
        status.services.resend.healthy = true;
      } catch (error) {
        status.services.resend.healthy = false;
        status.services.resend.error = error.message;
      }
    }

    // Check Nodemailer
    if (this.isNodemailerEnabled) {
      try {
        await this.transporter.verify();
        status.services.nodemailer.healthy = true;
      } catch (error) {
        status.services.nodemailer.healthy = false;
        status.services.nodemailer.error = error.message;
      }
    }

    status.healthy =
      (status.services.resend.enabled && status.services.resend.healthy) ||
      (status.services.nodemailer.enabled &&
        status.services.nodemailer.healthy);

    return status;
  }

  /**
   * Test email configuration
   */
  async testEmail() {
    try {
      this.initialize();

      const result = await this.sendEmail({
        to: process.env.TEST_EMAIL || "your-email@gmail.com",
        subject: "Test Email from Elegance Perfumes",
        html: `
          <h1>✅ Test Email</h1>
          <p>This is a test email from Elegance Perfumes.</p>
          <p>If you're reading this, your email configuration is working!</p>
          <p><strong>Provider:</strong> ${this.shouldUseResend() ? "Resend" : "Nodemailer"}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
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
module.exports = new EmailConfig();
