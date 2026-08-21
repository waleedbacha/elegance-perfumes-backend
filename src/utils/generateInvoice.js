/**
 * Invoice Generator Utility
 * Professional PDF invoice generation with multiple formats
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const { formatCurrency, formatDate } = require("./formatters");

class InvoiceGenerator {
  constructor() {
    this.invoiceDir = path.join(__dirname, "../../invoices");
    this.templateDir = path.join(__dirname, "../templates/invoice");
    this.logoPath = path.join(__dirname, "../../public/images/logo.png");

    // Create directories if they don't exist
    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
    }
    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
    }

    // Colors
    this.colors = {
      primary: "#1A1A2E",
      secondary: "#D4AF37",
      accent: "#E8D5B7",
      text: "#333333",
      light: "#F8F5F0",
      success: "#28a745",
      danger: "#dc3545",
      warning: "#ffc107",
      info: "#17a2b8",
    };
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoice(order) {
    try {
      const fileName = `invoice_${order.orderNumber}_${Date.now()}.pdf`;
      const filePath = path.join(this.invoiceDir, fileName);

      // Create PDF
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        autoFirstPage: true,
        bufferPages: true,
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Build invoice
      await this.buildInvoice(doc, order);

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const invoiceUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/invoices/${fileName}`;

      return {
        fileName,
        filePath,
        invoiceUrl,
        orderNumber: order.orderNumber,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Invoice generation failed:", error);
      throw new Error(`Failed to generate invoice: ${error.message}`);
    }
  }

  /**
   * Build invoice PDF
   */
  async buildInvoice(doc, order) {
    const {
      customer,
      items,
      orderNumber,
      total,
      subtotal,
      discount,
      shipping,
      tax,
      createdAt,
      shippingAddress,
      paymentMethod,
      status,
      tracking,
    } = order;

    // ==========================================
    // HEADER SECTION
    // ==========================================

    // Logo and Company Name
    try {
      if (fs.existsSync(this.logoPath)) {
        doc.image(this.logoPath, 50, 45, { width: 60 });
        doc.moveDown();
      }
    } catch (error) {
      // Logo not found, skip
    }

    // Company Info - Left
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(this.colors.primary)
      .text("ELEGANCE", 50, 50, { continued: true })
      .fillColor(this.colors.secondary)
      .text(" PERFUMES");

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(this.colors.text)
      .text("Luxury Fragrances for the Discerning", 50, 80)
      .text("123 Luxury Boulevard, Islamabad, Pakistan", 50, 95)
      .text("+923199457143 | info@elegance.pk", 50, 110);

    // Invoice Title - Right
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(this.colors.secondary)
      .text("INVOICE", 450, 50, { align: "right" });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(this.colors.text)
      .text(`Invoice #: INV-${orderNumber}`, 450, 75, { align: "right" })
      .text(`Date: ${formatDate(createdAt, "displayDatetime")}`, 450, 90, {
        align: "right",
      })
      .text(`Order #: ${orderNumber}`, 450, 105, { align: "right" });

    // Divider
    doc
      .moveTo(50, 130)
      .lineTo(550, 130)
      .strokeColor(this.colors.secondary)
      .lineWidth(2)
      .stroke();

    // ==========================================
    // ADDRESS SECTION
    // ==========================================

    const addressY = 155;

    // Bill To
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(this.colors.primary)
      .text("Bill To:", 50, addressY);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(this.colors.text)
      .text(customer.name, 50, addressY + 20)
      .text(customer.email, 50, addressY + 35)
      .text(customer.phone, 50, addressY + 50);

    // Shipping Address
    if (shippingAddress) {
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(this.colors.primary)
        .text("Ship To:", 300, addressY);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(shippingAddress.name, 300, addressY + 20)
        .text(shippingAddress.street, 300, addressY + 35)
        .text(
          `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`,
          300,
          addressY + 50,
        )
        .text(shippingAddress.country || "Pakistan", 300, addressY + 65);
    }

    // Order Info Box
    const infoY = 155;
    doc
      .rect(400, infoY, 150, 85)
      .strokeColor(this.colors.accent)
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(this.colors.text)
      .text("Order Details", 410, infoY + 10);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(this.colors.text)
      .text(`Status: ${status.toUpperCase()}`, 410, infoY + 28)
      .text(`Payment: ${paymentMethod.toUpperCase()}`, 410, infoY + 43)
      .text(`Items: ${items.length}`, 410, infoY + 58)
      .text(`Total: ${formatCurrency(total)}`, 410, infoY + 73);

    // ==========================================
    // TABLE SECTION
    // ==========================================

    const tableTop = 280;
    const colWidths = [250, 70, 80, 80, 80];

    // Table Header
    doc.rect(50, tableTop, 500, 30).fillColor(this.colors.primary).fill();

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Product Description", 60, tableTop + 8)
      .text("Qty", 310, tableTop + 8, { align: "center" })
      .text("Unit Price", 385, tableTop + 8, { align: "center" })
      .text("Discount", 460, tableTop + 8, { align: "center" })
      .text("Total", 520, tableTop + 8, { align: "right" });

    // Table Rows
    let currentY = tableTop + 45;

    items.forEach((item, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        doc
          .rect(50, currentY - 2, 500, 35)
          .fillColor(this.colors.light)
          .fill();
      }

      const productName = `${item.name}${item.size ? ` (${item.size})` : ""}`;
      const unitPrice = item.price - (item.discount || 0);

      doc
        .fillColor(this.colors.text)
        .font("Helvetica")
        .fontSize(9)
        .text(productName, 60, currentY + 5, {
          width: 240,
          ellipsis: true,
        })
        .text(item.brand || "", 60, currentY + 20, {
          font: "Helvetica-Oblique",
          fontSize: 7,
          color: this.colors.text,
          opacity: 0.6,
        })
        .text(item.quantity.toString(), 310, currentY + 10, { align: "center" })
        .text(formatCurrency(unitPrice), 385, currentY + 10, {
          align: "center",
        })
        .text(item.discount ? `-${item.discount}%` : "-", 460, currentY + 10, {
          align: "center",
        })
        .text(formatCurrency(item.total), 520, currentY + 10, {
          align: "right",
        });

      currentY += 45;

      // Page break if needed
      if (currentY > 680) {
        doc.addPage();
        currentY = 50;

        // Re-draw table header on new page
        doc.rect(50, currentY, 500, 30).fillColor(this.colors.primary).fill();

        doc
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .fontSize(10)
          .text("Product Description", 60, currentY + 8)
          .text("Qty", 310, currentY + 8, { align: "center" })
          .text("Unit Price", 385, currentY + 8, { align: "center" })
          .text("Discount", 460, currentY + 8, { align: "center" })
          .text("Total", 520, currentY + 8, { align: "right" });

        currentY += 45;
      }
    });

    // Table Footer Line
    doc
      .moveTo(50, currentY)
      .lineTo(550, currentY)
      .strokeColor(this.colors.accent)
      .lineWidth(1)
      .stroke();

    // ==========================================
    // TOTALS SECTION
    // ==========================================

    const totalsY = Math.max(currentY + 30, 550);
    const totalsX = 380;

    // Totals
    doc.font("Helvetica").fontSize(10).fillColor(this.colors.text);

    // Subtotal
    doc
      .text("Subtotal:", totalsX, totalsY, { align: "right", width: 150 })
      .text(formatCurrency(subtotal), 520, totalsY, { align: "right" });

    // Discount
    if (discount > 0) {
      doc
        .text("Discount:", totalsX, totalsY + 20, {
          align: "right",
          width: 150,
        })
        .text(`- ${formatCurrency(discount)}`, 520, totalsY + 20, {
          align: "right",
          color: this.colors.danger,
        });
    }

    // Shipping
    if (shipping > 0) {
      doc
        .text("Shipping:", totalsX, totalsY + (discount > 0 ? 40 : 20), {
          align: "right",
          width: 150,
        })
        .text(
          formatCurrency(shipping),
          520,
          totalsY + (discount > 0 ? 40 : 20),
          { align: "right" },
        );
    }

    // Tax
    if (tax > 0) {
      const taxY = totalsY + (discount > 0 ? 60 : 40) + (shipping > 0 ? 20 : 0);
      doc
        .text("Tax (5%):", totalsX, taxY, { align: "right", width: 150 })
        .text(formatCurrency(tax), 520, taxY, { align: "right" });
    }

    // Grand Total
    const grandTotalY =
      totalsY +
      80 +
      (discount > 0 ? 20 : 0) +
      (shipping > 0 ? 20 : 0) +
      (tax > 0 ? 20 : 0);

    // Grand Total Box
    doc
      .rect(totalsX - 10, grandTotalY - 10, 180, 45)
      .fillColor(this.colors.secondary)
      .fill();

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("TOTAL:", totalsX + 10, grandTotalY + 5)
      .text(formatCurrency(total), 530, grandTotalY + 5, {
        align: "right",
        width: 140,
      });

    // ==========================================
    // FOOTER SECTION
    // ==========================================

    const footerY = 780;

    // Divider
    doc
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .strokeColor(this.colors.primary)
      .lineWidth(1)
      .stroke();

    // Footer Text
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(this.colors.text)
      .text(
        "Thank you for choosing Elegance Perfumes. Your satisfaction is our priority.",
        50,
        footerY + 15,
        { align: "center", width: 500 },
      )
      .text(
        "For any queries, contact us at elegance.myperfume@gmail.com | +923199457143",
        50,
        footerY + 30,
        { align: "center", width: 500 },
      )
      .text(
        `Generated on: ${formatDate(new Date(), "displayDatetime")}`,
        50,
        footerY + 45,
        {
          align: "center",
          width: 500,
          font: "Helvetica-Oblique",
          fontSize: 7,
        },
      );

    // ==========================================
    // TERMS & CONDITIONS
    // ==========================================

    if (footerY + 70 < 842) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(7)
        .fillColor("#888888")
        .text(
          "Terms & Conditions: This invoice is valid for 30 days from the date of issue.",
          50,
          footerY + 60,
          { align: "center", width: 500 },
        )
        .text(
          "All prices are in PKR and include applicable taxes.",
          50,
          footerY + 72,
          { align: "center", width: 500 },
        );
    }
  }

  /**
   * Generate invoice as HTML (for email attachments)
   */
  async generateInvoiceHtml(order) {
    try {
      const template = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #f8f5f0; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #1a1a2e; font-size: 28px; }
            .header h1 span { color: #d4af37; }
            .company-info { color: #666; font-size: 12px; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { color: #d4af37; font-size: 24px; }
            .address-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .address-box { flex: 1; }
            .address-box h3 { color: #1a1a2e; font-size: 14px; margin-bottom: 10px; }
            .address-box p { color: #333; font-size: 12px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #1a1a2e; color: white; padding: 12px; text-align: left; font-size: 12px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            tr:nth-child(even) { background: #f8f5f0; }
            .totals { text-align: right; margin-top: 20px; }
            .totals p { margin: 5px 0; font-size: 12px; }
            .grand-total { background: #d4af37; color: white; padding: 15px; border-radius: 4px; font-size: 18px; font-weight: bold; margin-top: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 11px; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-shipped { background: #cce5ff; color: #004085; }
            .status-delivered { background: #d4edda; color: #155724; }
            .status-cancelled { background: #f8d7da; color: #721c24; }
            @media (max-width: 600px) {
              .invoice { padding: 20px; }
              .header { flex-direction: column; }
              .invoice-title { text-align: left; margin-top: 10px; }
              .address-section { flex-direction: column; }
              .address-box { margin-bottom: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <div>
                <h1>ELEGANCE <span>PERFUMES</span></h1>
                <div class="company-info">
                  <p>123 Luxury Boulevard, Islamabad, Pakistan</p>
                  <p>+923199457143 | info@elegance.pk</p>
                </div>
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> INV-{{orderNumber}}</p>
                <p><strong>Date:</strong> {{invoiceDate}}</p>
                <p><strong>Order #:</strong> {{orderNumber}}</p>
              </div>
            </div>

            <div class="address-section">
              <div class="address-box">
                <h3>Bill To:</h3>
                <p><strong>{{customer.name}}</strong></p>
                <p>{{customer.email}}</p>
                <p>{{customer.phone}}</p>
              </div>
              {{#if shippingAddress}}
              <div class="address-box">
                <h3>Ship To:</h3>
                <p><strong>{{shippingAddress.name}}</strong></p>
                <p>{{shippingAddress.street}}</p>
                <p>{{shippingAddress.city}}, {{shippingAddress.state}} {{shippingAddress.zipCode}}</p>
                <p>{{shippingAddress.country}}</p>
              </div>
              {{/if}}
              <div class="address-box" style="text-align: right;">
                <p><strong>Status:</strong> <span class="status-badge status-{{status}}">{{status}}</span></p>
                <p><strong>Payment:</strong> {{paymentMethod}}</p>
                <p><strong>Items:</strong> {{itemsCount}}</p>
                <p><strong>Total:</strong> {{total}}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr>
                  <td><strong>{{this.name}}</strong>{{#if this.size}} ({{this.size}}){{/if}}<br><span style="font-size: 11px; color: #666;">{{this.brand}}</span></td>
                  <td style="text-align: center;">{{this.quantity}}</td>
                  <td style="text-align: right;">{{this.unitPrice}}</td>
                  <td style="text-align: right;">{{this.total}}</td>
                </tr>
                {{/each}}
              </tbody>
            </table>

            <div class="totals">
              <p><strong>Subtotal:</strong> {{subtotal}}</p>
              {{#if discount}}
              <p><strong>Discount:</strong> - {{discount}}</p>
              {{/if}}
              {{#if shipping}}
              <p><strong>Shipping:</strong> {{shipping}}</p>
              {{/if}}
              {{#if tax}}
              <p><strong>Tax (5%):</strong> {{tax}}</p>
              {{/if}}
              <div class="grand-total">
                TOTAL: {{total}}
              </div>
            </div>

            <div class="footer">
              <p>Thank you for choosing Elegance Perfumes. Your satisfaction is our priority.</p>
              <p>For any queries, contact us at elegance.myperfume@gmail.com | +923199457143</p>
              <p style="margin-top: 10px;">Generated on: {{generatedAt}}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const compiled = handlebars.compile(template);

      const itemsData = items.map((item) => ({
        name: item.name,
        brand: item.brand || "",
        size: item.size || "",
        quantity: item.quantity,
        unitPrice: formatCurrency(item.price - (item.discount || 0)),
        total: formatCurrency(item.total),
      }));

      const html = compiled({
        orderNumber,
        invoiceDate: formatDate(createdAt, "displayDatetime"),
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
        shippingAddress: shippingAddress || null,
        status: status.toLowerCase(),
        paymentMethod: paymentMethod.toUpperCase(),
        itemsCount: items.length,
        items: itemsData,
        subtotal: formatCurrency(subtotal),
        discount: discount > 0 ? formatCurrency(discount) : null,
        shipping: shipping > 0 ? formatCurrency(shipping) : null,
        tax: tax > 0 ? formatCurrency(tax) : null,
        total: formatCurrency(total),
        generatedAt: formatDate(new Date(), "displayDatetime"),
      });

      return html;
    } catch (error) {
      console.error("HTML invoice generation failed:", error);
      throw new Error(`Failed to generate HTML invoice: ${error.message}`);
    }
  }

  /**
   * Generate invoice as JSON data
   */
  async generateInvoiceJson(order) {
    try {
      return {
        invoiceNumber: `INV-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        customer: {
          name: order.customer.name,
          email: order.customer.email,
          phone: order.customer.phone,
        },
        shippingAddress: order.shippingAddress || null,
        items: order.items.map((item) => ({
          name: item.name,
          brand: item.brand || "",
          size: item.size || "",
          quantity: item.quantity,
          unitPrice: item.price - (item.discount || 0),
          discount: item.discount || 0,
          total: item.total,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.paymentMethod,
        status: order.status,
        tracking: order.tracking || null,
        notes: order.notes || "",
      };
    } catch (error) {
      console.error("JSON invoice generation failed:", error);
      throw new Error(`Failed to generate JSON invoice: ${error.message}`);
    }
  }

  /**
   * Get invoice by order number
   */
  async getInvoice(orderNumber) {
    try {
      const files = fs.readdirSync(this.invoiceDir);
      const invoiceFile = files.find((f) =>
        f.includes(`invoice_${orderNumber}`),
      );

      if (!invoiceFile) {
        return null;
      }

      const filePath = path.join(this.invoiceDir, invoiceFile);
      const fileContent = fs.readFileSync(filePath);

      return {
        fileName: invoiceFile,
        filePath,
        fileContent,
        contentType: "application/pdf",
        size: fs.statSync(filePath).size,
        createdAt: fs.statSync(filePath).birthtime,
      };
    } catch (error) {
      console.error("Invoice retrieval failed:", error);
      throw new Error(`Failed to retrieve invoice: ${error.message}`);
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(orderNumber) {
    try {
      const files = fs.readdirSync(this.invoiceDir);
      const invoiceFile = files.find((f) =>
        f.includes(`invoice_${orderNumber}`),
      );

      if (invoiceFile) {
        const filePath = path.join(this.invoiceDir, invoiceFile);
        fs.unlinkSync(filePath);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Invoice deletion failed:", error);
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }

  /**
   * Get all invoices for an order
   */
  async getOrderInvoices(orderNumber) {
    try {
      const files = fs.readdirSync(this.invoiceDir);
      const invoices = files
        .filter((f) => f.includes(`invoice_${orderNumber}`))
        .map((file) => ({
          fileName: file,
          filePath: path.join(this.invoiceDir, file),
          size: fs.statSync(path.join(this.invoiceDir, file)).size,
          createdAt: fs.statSync(path.join(this.invoiceDir, file)).birthtime,
        }));

      return invoices;
    } catch (error) {
      console.error("Order invoices retrieval failed:", error);
      throw new Error(`Failed to retrieve order invoices: ${error.message}`);
    }
  }

  /**
   * Clean up old invoices
   */
  async cleanupInvoices(days = 30) {
    try {
      const files = fs.readdirSync(this.invoiceDir);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      let deleted = 0;

      for (const file of files) {
        const filePath = path.join(this.invoiceDir, file);
        const stats = fs.statSync(filePath);

        if (stats.birthtime < cutoff) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      }

      return {
        deleted,
        remaining: files.length - deleted,
        cutoff: cutoff.toISOString(),
      };
    } catch (error) {
      console.error("Invoice cleanup failed:", error);
      throw new Error(`Failed to cleanup invoices: ${error.message}`);
    }
  }

  /**
   * Get invoice statistics
   */
  async getInvoiceStats() {
    try {
      const files = fs.readdirSync(this.invoiceDir);

      let totalSize = 0;
      let oldest = null;
      let newest = null;

      for (const file of files) {
        const filePath = path.join(this.invoiceDir, file);
        const stats = fs.statSync(filePath);

        totalSize += stats.size;

        if (!oldest || stats.birthtime < oldest) {
          oldest = stats.birthtime;
        }
        if (!newest || stats.birthtime > newest) {
          newest = stats.birthtime;
        }
      }

      return {
        totalInvoices: files.length,
        totalSize,
        averageSize: files.length > 0 ? totalSize / files.length : 0,
        oldest: oldest,
        newest: newest,
        directory: this.invoiceDir,
      };
    } catch (error) {
      console.error("Invoice stats retrieval failed:", error);
      throw new Error(`Failed to get invoice stats: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new InvoiceGenerator();
