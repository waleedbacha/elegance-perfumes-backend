// backend/src/services/whatsappService.js

const twilio = require("twilio");
const axios = require("axios");

class WhatsAppService {
  constructor() {
    // ✅ Production URLs
    this.frontendUrl =
      process.env.FRONTEND_URL || "https://elegance-perfumes.vercel.app";
    this.backendUrl =
      process.env.BACKEND_URL ||
      "https://elegance-perfumes-backend-production.up.railway.app";

    // ✅ Twilio Production Credentials (if using Twilio)
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // ✅ WhatsApp Business API (Meta) - Using YOUR .env variable names
    this.phoneNumberId = process.env.WABA_PHONE_NUMBER_ID;
    this.whatsappApiToken = process.env.WABA_ACCESS_TOKEN;
    // ✅ Build the API URL dynamically using the phone number ID
    this.whatsappApiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    // ✅ Which provider to use (default to 'meta' since you have Meta variables)
    this.provider = process.env.WHATSAPP_PROVIDER || "meta";

    // ✅ Environment detection
    this.isProduction = process.env.NODE_ENV === "production";
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsAppMessage(to, message) {
    try {
      const formattedNumber = this.formatPhoneNumber(to);

      if (this.isProduction) {
        console.log(`📱 Sending WhatsApp to: ${formattedNumber}`);
        console.log(`📱 Message: ${message.substring(0, 100)}...`);
      }

      if (this.provider === "meta") {
        return await this.sendViaMetaAPI(formattedNumber, message);
      } else {
        return await this.sendViaTwilio(formattedNumber, message);
      }
    } catch (error) {
      console.error("❌ WhatsApp send failed:", error.message);
      if (this.isProduction) {
        console.error("📱 Full error:", error);
      }
      throw error;
    }
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(to, message) {
    const client = twilio(this.accountSid, this.authToken);

    const response = await client.messages.create({
      body: message,
      from: `whatsapp:${this.fromNumber}`,
      to: `whatsapp:${to}`,
    });

    console.log("✅ WhatsApp message sent (Twilio):", response.sid);
    return response;
  }

  /**
   * Send via Meta WhatsApp Business API
   */
  async sendViaMetaAPI(to, message) {
    const response = await axios.post(
      this.whatsappApiUrl,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${this.whatsappApiToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(
      "✅ WhatsApp message sent (Meta):",
      response.data.messages?.[0]?.id,
    );
    return response.data;
  }

  /**
   * Format phone number for WhatsApp
   */
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, "");

    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.length > 0 && !cleaned.startsWith("92")) {
      cleaned = `92${cleaned}`;
    }

    if (cleaned.length !== 12) {
      console.warn(
        `⚠️ Phone number ${cleaned} may not be valid (should be 12 digits)`,
      );
    }

    return cleaned;
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation(order, user) {
    const orderUrl = `${this.frontendUrl}/orders/${order._id}`;

    const message = `
🛍️ *Order Confirmed!*

Thank you for your order, ${user.name || "Customer"}!

📦 *Order #${order.orderNumber}*
💰 Total: PKR ${order.total.toLocaleString()}
📅 Date: ${new Date(order.createdAt).toLocaleDateString()}

Items:
${order.items.map((item) => `  • ${item.name} (${item.size}) x${item.quantity}`).join("\n")}

📋 View Order: ${orderUrl}

💬 Questions? Reply to this message!

Elegance Perfumes
✨ Luxury Fragrances
    `.trim();

    try {
      const phone = user.phone || order.customer?.phone;
      if (!phone) {
        console.warn("⚠️ No phone number found for WhatsApp");
        return null;
      }

      return await this.sendWhatsAppMessage(phone, message);
    } catch (error) {
      console.error("❌ Order confirmation WhatsApp failed:", error.message);
      return null;
    }
  }

  /**
   * Send order status update via WhatsApp
   */
  async sendOrderStatusUpdate(order, user, oldStatus, newStatus) {
    const orderUrl = `${this.frontendUrl}/orders/${order._id}`;

    const statusMessages = {
      confirmed: "✅ Your order has been confirmed!",
      processing: "🔧 Your order is being processed.",
      shipped: "📦 Your order has been shipped!",
      delivered: "🎉 Your order has been delivered!",
      cancelled: "❌ Your order has been cancelled.",
    };

    const message = `
📦 *Order Update*

Order #${order.orderNumber}
Status: ${newStatus.toUpperCase()}

${statusMessages[newStatus] || `Your order is now ${newStatus}.`}

📋 View Order: ${orderUrl}

Elegance Perfumes
✨ Luxury Fragrances
    `.trim();

    try {
      const phone = user.phone || order.customer?.phone;
      if (!phone) {
        console.warn("⚠️ No phone number found for WhatsApp");
        return null;
      }

      return await this.sendWhatsAppMessage(phone, message);
    } catch (error) {
      console.error("❌ Status update WhatsApp failed:", error.message);
      return null;
    }
  }
}

module.exports = new WhatsAppService();
