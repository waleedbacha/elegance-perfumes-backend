const axios = require("axios");

class WhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.WABA_PHONE_NUMBER_ID;
    this.accessToken = process.env.WABA_ACCESS_TOKEN;
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send order confirmation with interactive buttons
   */
  async sendOrderConfirmation(order, user) {
    try {
      const phoneNumber = this.formatPhoneNumber(
        user.phone || order.shippingAddress?.phone,
      );

      if (!phoneNumber) {
        console.error("❌ No phone number found for WhatsApp");
        return;
      }

      console.log(`📱 Sending WhatsApp to: ${phoneNumber}`);

      const data = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "order_confirmation_action",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: user.name || "Customer" },
                { type: "text", text: order.orderNumber },
                { type: "text", text: order.total.toLocaleString() },
              ],
            },
          ],
        },
      };

      const response = await axios.post(this.apiUrl, data, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`✅ WhatsApp message sent to ${phoneNumber}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ WhatsApp send failed:",
        error.response?.data || error.message,
      );
      // Don't throw error - just log it so order doesn't fail
      return null;
    }
  }

  /**
   * Send shipping notification
   */
  async sendShippingNotification(order, user) {
    try {
      const phoneNumber = this.formatPhoneNumber(
        user.phone || order.shippingAddress?.phone,
      );

      if (!phoneNumber) {
        console.error("❌ No phone number found for WhatsApp");
        return;
      }

      console.log(
        `📱 Sending WhatsApp shipping notification to: ${phoneNumber}`,
      );

      const data = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "template",
        template: {
          name: "shipping_notification",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: user.name || "Customer" },
                { type: "text", text: order.orderNumber },
                { type: "text", text: order.tracking?.number || "N/A" },
              ],
            },
          ],
        },
      };

      const response = await axios.post(this.apiUrl, data, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`✅ WhatsApp shipping notification sent to ${phoneNumber}`);
      return response.data;
    } catch (error) {
      console.error(
        "❌ WhatsApp shipping notification failed:",
        error.response?.data || error.message,
      );
      return null;
    }
  }

  /**
   * Format phone number for WhatsApp (E.164 format)
   * Input: 03459270471 or +923459270471 or 923459270471
   * Output: 923459270471 (no +, no spaces)
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-numeric characters (spaces, dashes, parentheses, plus)
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

    // Remove leading 0 if present (Pakistan format)
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    // Add 92 if not present (Pakistan country code)
    if (cleaned.length > 0 && !cleaned.startsWith("92")) {
      cleaned = `92${cleaned}`;
    }

    // Return only if valid (12 digits for Pakistan)
    if (cleaned.length === 12) {
      return cleaned;
    }

    // If it's already formatted correctly, return it
    if (cleaned.length > 0) {
      return cleaned;
    }

    return null;
  }
}

module.exports = new WhatsAppService();
