/**
 * Email Templates Utility
 * HTML email templates
 */

const handlebars = require("handlebars");

class EmailTemplates {
  constructor() {
    // Register Handlebars helpers
    handlebars.registerHelper("formatCurrency", (amount) => {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    });

    handlebars.registerHelper("formatDate", (date) => {
      return new Date(date).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    });

    handlebars.registerHelper("truncate", (text, length) => {
      if (!text) return "";
      if (text.length <= length) return text;
      return text.substring(0, length) + "...";
    });

    handlebars.registerHelper("uppercase", (text) => {
      return text ? text.toUpperCase() : "";
    });

    handlebars.registerHelper("capitalize", (text) => {
      if (!text) return "";
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    });
  }

  /**
   * Get base layout
   */
  getBaseLayout(content) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Elegance Perfumes</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8f5f0;
          color: #1a1a2e;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%);
          padding: 40px 20px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .header h1 {
          color: #d4af37;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .header p {
          color: #e8d5b7;
          font-size: 14px;
          margin-top: 5px;
        }
        .content {
          background: #ffffff;
          padding: 40px 30px;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .footer a {
          color: #d4af37;
          text-decoration: none;
        }
        .button {
          display: inline-block;
          background: #d4af37;
          color: #1a1a2e !important;
          padding: 12px 30px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          margin: 15px 0;
        }
        .button:hover {
          background: #c4a030;
        }
        .divider {
          border: none;
          border-top: 2px solid #f0ebe4;
          margin: 20px 0;
        }
        .order-item {
          padding: 10px 0;
          border-bottom: 1px solid #f0ebe4;
        }
        .order-item:last-child {
          border-bottom: none;
        }
        .text-center {
          text-align: center;
        }
        .text-muted {
          color: #888;
          font-size: 12px;
        }
        .badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge-success {
          background: #d4edda;
          color: #155724;
        }
        .badge-warning {
          background: #fff3cd;
          color: #856404;
        }
        .badge-danger {
          background: #f8d7da;
          color: #721c24;
        }
        @media (max-width: 480px) {
          .container {
            padding: 10px;
          }
          .content {
            padding: 20px 15px;
          }
          .header h1 {
            font-size: 22px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ELEGANCE PERFUMES</h1>
          <p>Luxury Fragrances for the Discerning</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>
            &copy; ${new Date().getFullYear()} Elegance Perfumes. All rights reserved.<br>
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> | 
            <a href="{{privacyUrl}}">Privacy Policy</a> | 
            <a href="{{supportUrl}}">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Compile template with data
   */
  compile(templateName, data) {
    const templates = {
      welcome: this.getWelcomeTemplate(data),
      verification: this.getVerificationTemplate(data),
      "password-reset": this.getPasswordResetTemplate(data),
      "password-changed": this.getPasswordChangedTemplate(data),
      "order-confirmation": this.getOrderConfirmationTemplate(data),
      "order-status-update": this.getOrderStatusUpdateTemplate(data),
      "shipping-confirmation": this.getShippingConfirmationTemplate(data),
      "delivery-confirmation": this.getDeliveryConfirmationTemplate(data),
      "abandoned-cart": this.getAbandonedCartTemplate(data),
      "review-request": this.getReviewRequestTemplate(data),
      "admin-notification": this.getAdminNotificationTemplate(data),
      promotional: this.getPromotionalTemplate(data),
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    return this.getBaseLayout(template);
  }

  /**
   * Welcome template
   */
  getWelcomeTemplate(data) {
    return `
      <h2>Welcome to Elegance Perfumes, {{name}}! 👋</h2>
      <p>We're thrilled to have you join our community of fragrance enthusiasts.</p>
      <p>At Elegance Perfumes, we curate the finest luxury fragrances from around the world.</p>
      <div class="text-center">
        <a href="{{shopUrl}}" class="button">Start Shopping</a>
      </div>
      <p>As a welcome gift, enjoy <strong>10% off</strong> your first order with code:</p>
      <div style="background: #f8f5f0; padding: 15px; text-align: center; border-radius: 6px; margin: 10px 0;">
        <strong style="font-size: 20px; color: #d4af37;">WELCOME10</strong>
      </div>
      <p style="font-size: 14px; color: #666;">If you have any questions, feel free to <a href="{{supportUrl}}">contact us</a>.</p>
      <p>Warm regards,<br>The Elegance Perfumes Team</p>
    `;
  }

  /**
   * Verification template
   */
  getVerificationTemplate(data) {
    return `
      <h2>Verify Your Email Address</h2>
      <p>Hi {{name}},</p>
      <p>Please verify your email address to complete your registration and start enjoying our premium fragrances.</p>
      <div class="text-center">
        <a href="{{verificationUrl}}" class="button">Verify Email</a>
      </div>
      <p style="font-size: 14px; color: #666;">
        This link will expire in {{expiresIn}}.<br>
        If you didn't create an account, you can ignore this email.
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #888;">{{verificationUrl}}</p>
    `;
  }

  /**
   * Password reset template
   */
  getPasswordResetTemplate(data) {
    return `
      <h2>Reset Your Password</h2>
      <p>Hi {{name}},</p>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <div class="text-center">
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #666;">
        This link will expire in {{expiresIn}}.<br>
        If you didn't request this, you can safely ignore this email.
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 12px; color: #888;">{{resetUrl}}</p>
    `;
  }

  /**
   * Password changed template
   */
  getPasswordChangedTemplate(data) {
    return `
      <h2>Password Changed Successfully</h2>
      <p>Hi {{name}},</p>
      <p>Your password has been successfully changed.</p>
      <p style="font-size: 14px; color: #666;">
        If you didn't make this change, please <a href="{{supportUrl}}">contact us</a> immediately.
      </p>
      <div class="text-center">
        <a href="{{loginUrl}}" class="button">Log In</a>
      </div>
    `;
  }

  /**
   * Order confirmation template
   */
  getOrderConfirmationTemplate(data) {
    return `
      <h2>Order Confirmed!</h2>
      <p>Hi {{name}},</p>
      <p>Thank you for your order! We're excited to prepare your luxurious fragrances.</p>
      
      <div style="background: #f8f5f0; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Order Number:</strong> {{orderNumber}}</p>
        <p><strong>Order Date:</strong> {{orderDate}}</p>
        <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
      </div>
      
      <h3>Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8f5f0;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          {{{items}}}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 10px; text-align: right;">{{formatCurrency subtotal}}</td>
          </tr>
          {{#if discount}}
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Discount:</strong></td>
            <td style="padding: 10px; text-align: right;">-{{formatCurrency discount}}</td>
          </tr>
          {{/if}}
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
            <td style="padding: 10px; text-align: right;">{{formatCurrency shipping}}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Tax:</strong></td>
            <td style="padding: 10px; text-align: right;">{{formatCurrency tax}}</td>
          </tr>
          <tr style="font-size: 18px; font-weight: 700;">
            <td colspan="2" style="padding: 10px; text-align: right; color: #d4af37;">Total:</td>
            <td style="padding: 10px; text-align: right; color: #d4af37;">{{formatCurrency total}}</td>
          </tr>
        </tfoot>
      </table>

      <h3>Shipping Address</h3>
      <p style="background: #f8f5f0; padding: 15px; border-radius: 6px;">
        {{shippingAddress.name}}<br>
        {{shippingAddress.street}}<br>
        {{shippingAddress.city}}, {{shippingAddress.state}} {{shippingAddress.zipCode}}<br>
        {{shippingAddress.country}}
      </p>

      <div class="text-center">
        <a href="{{orderUrl}}" class="button">View Order Details</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">You will receive a confirmation SMS on your provided phone number.</p>
    `;
  }

  /**
   * Order status update template
   */
  getOrderStatusUpdateTemplate(data) {
    return `
      <h2>Order Status Update</h2>
      <p>Hi {{name}},</p>
      <p>Your order #{{orderNumber}} has been updated.</p>
      
      <div style="background: #f8f5f0; padding: 15px; border-radius: 6px; text-align: center;">
        <p><strong>Status:</strong> <span class="badge badge-success">{{capitalize newStatus}}</span></p>
        <p style="margin-top: 10px;">{{message}}</p>
      </div>

      {{#if trackingNumber}}
      <div style="background: #f8f5f0; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
        {{#if trackingUrl}}
        <a href="{{trackingUrl}}" target="_blank">Track your order</a>
        {{/if}}
      </div>
      {{/if}}

      <div class="text-center">
        <a href="{{orderUrl}}" class="button">View Order</a>
      </div>
    `;
  }

  /**
   * Shipping confirmation template
   */
  getShippingConfirmationTemplate(data) {
    return `
      <h2>Your Order Has Been Shipped! 📦</h2>
      <p>Hi {{name}},</p>
      <p>Your order #{{orderNumber}} is on its way to you.</p>
      
      <div style="background: #f8f5f0; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
        <p><strong>Carrier:</strong> {{trackingProvider}}</p>
        {{#if estimatedDelivery}}
        <p><strong>Estimated Delivery:</strong> {{formatDate estimatedDelivery}}</p>
        {{/if}}
      </div>

      <div class="text-center">
        <a href="{{trackingUrl}}" class="button">Track Order</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">We hope you love your new fragrances!</p>
    `;
  }

  /**
   * Delivery confirmation template
   */
  getDeliveryConfirmationTemplate(data) {
    return `
      <h2>Your Order Has Been Delivered!</h2>
      <p>Hi {{name}},</p>
      <p>Your order #{{orderNumber}} has been successfully delivered.</p>
      
      <div style="background: #f8f5f0; padding: 15px; border-radius: 6px; text-align: center;">
        <p><strong>Delivered on:</strong> {{formatDate deliveredAt}}</p>
      </div>

      <p>We hope you love your new fragrances!</p>
      
      <div class="text-center">
        <a href="{{reviewUrl}}" class="button">Leave a Review</a>
        <a href="{{orderUrl}}" class="button" style="background: #666; color: white !important;">View Order</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">Your feedback helps us improve and helps other customers make informed decisions.</p>
    `;
  }

  /**
   * Abandoned cart template
   */
  getAbandonedCartTemplate(data) {
    return `
      <h2>You Left Something in Your Cart! 🛒</h2>
      <p>Hi {{name}},</p>
      <p>We noticed you left some amazing fragrances in your cart.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background: #f8f5f0;">
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: center;">Qty</th>
            <th style="padding: 10px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          {{{items}}}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 10px; text-align: right;">{{formatCurrency subtotal}}</td>
          </tr>
        </tfoot>
      </table>

      {{#if discount}}
      <div style="background: #d4edda; padding: 15px; border-radius: 6px; text-align: center; margin: 15px 0;">
        <p style="font-size: 18px; font-weight: 700; color: #155724;">
          🎁 Get {{discount}} OFF your order!
        </p>
      </div>
      {{/if}}

      <div class="text-center">
        <a href="{{cartUrl}}" class="button">Complete Your Order</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">These items are selling fast, don't miss out!</p>
    `;
  }

  /**
   * Review request template
   */
  getReviewRequestTemplate(data) {
    return `
      <h2>How do you like {{productName}}? 🌟</h2>
      <p>Hi {{name}},</p>
      <p>We hope you're enjoying your new fragrance from Elegance Perfumes.</p>
      
      <div style="background: #f8f5f0; padding: 20px; border-radius: 6px; text-align: center; margin: 15px 0;">
        <p style="font-size: 18px; font-weight: 700;">{{productName}}</p>
        <p style="font-size: 14px; color: #666;">Order #{{orderNumber}}</p>
      </div>

      <p>Would you mind sharing your experience? Your review helps other fragrance lovers make the right choice.</p>
      
      <div class="text-center">
        <a href="{{reviewUrl}}" class="button">Write a Review</a>
      </div>
      
      <p style="font-size: 14px; color: #666;">It takes just 2 minutes and you'll help our community!</p>
    `;
  }

  /**
   * Admin notification template
   */
  getAdminNotificationTemplate(data) {
    return `
      <h2>🔔 Admin Notification</h2>
      <p><strong>Subject:</strong> {{subject}}</p>
      <p>{{message}}</p>
      
      {{#if data}}
      <div style="background: #f8f5f0; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p><strong>Data:</strong></p>
        <pre style="background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">{{data}}</pre>
      </div>
      {{/if}}
      
      <p style="font-size: 14px; color: #666;">This is an automated notification from Elegance Perfumes.</p>
    `;
  }

  /**
   * Promotional template
   */
  getPromotionalTemplate(data) {
    return `
      <h2>{{title}}</h2>
      <div style="text-align: center; margin: 15px 0;">
        {{#if image}}
        <img src="{{image}}" alt="Promotion" style="max-width: 100%; border-radius: 8px;">
        {{/if}}
      </div>
      <p>{{{content}}}</p>
      
      {{#if buttonText}}
      <div class="text-center">
        <a href="{{buttonUrl}}" class="button">{{buttonText}}</a>
      </div>
      {{/if}}
      
      <p style="font-size: 14px; color: #666;">To stop receiving these emails, <a href="{{unsubscribeUrl}}">unsubscribe here</a>.</p>
    `;
  }
}

module.exports = new EmailTemplates();
