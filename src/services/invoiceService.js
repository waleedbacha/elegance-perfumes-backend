/**
 * Invoice Service
 * Professional PDF invoice generation - Clean Design
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

class InvoiceService {
  constructor() {
    this.invoiceDir = path.join(__dirname, "../../invoices");

    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
    }
  }

  async generateInvoice(order) {
    try {
      const fileName = `invoice_${order.orderNumber}_${Date.now()}.pdf`;
      const filePath = path.join(this.invoiceDir, fileName);

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice ${order.orderNumber}`,
          Author: "Elegance Perfumes",
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      this.buildInvoice(doc, order);
      doc.end();

      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const baseUrl =
        process.env.BACKEND_URL ||
        `http://localhost:${process.env.PORT || 5000}`;
      const invoiceUrl = `${baseUrl}/invoices/${fileName}`;

      return invoiceUrl;
    } catch (error) {
      logger.error("Invoice generation failed", { error: error.message });
      throw new AppError("Failed to generate invoice", 500, "INVOICE_FAILED");
    }
  }

  safeNumber(value) {
    return value === undefined || value === null || isNaN(value) ? 0 : value;
  }

  formatCurrency(amount) {
    const num = this.safeNumber(amount);
    return `PKR ${Math.round(num).toLocaleString()}`;
  }

  buildInvoice(doc, order) {
    const {
      customer,
      items,
      orderNumber,
      total,
      subtotal,
      productDiscount,
      couponDiscount,
      coupon,
      shipping,
      createdAt,
      status,
      paymentMethod,
      shippingAddress,
    } = order;

    // Safe values
    const safeTotal = this.safeNumber(total);
    const safeSubtotal = this.safeNumber(subtotal);
    const safeProductDiscount = this.safeNumber(productDiscount);
    const safeCouponDiscount = this.safeNumber(couponDiscount);
    const safeShipping = this.safeNumber(shipping);
    const safeStatus = status || "pending";
    const safePaymentMethod = paymentMethod || "cod";

    // Colors
    const colors = {
      primary: "#1A1A2E",
      gold: "#D4AF37",
      red: "#8B0000",
      text: "#333333",
      lightText: "#6B7280",
      white: "#FFFFFF",
      green: "#10B981",
      border: "#E5E7EB",
      lightBg: "#F9FAFB",
    };

    // ==========================================
    // HEADER SECTION
    // ==========================================

    let y = 40;

    // Gold accent line
    doc.rect(50, y, 510, 3).fillColor(colors.gold).fill();
    y += 15;

    // Company Name - Left
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(colors.primary)
      .text("ELEGANCE", 50, y);

    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(colors.gold)
      .text(" PERFUMES", 50 + doc.widthOfString("ELEGANCE"), y);

    // Tagline
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.lightText)
      .text("Luxury Fragrances", 50, y + 30);

    // Invoice Title - Right
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(colors.primary)
      .text("INVOICE", 450, y + 5, { align: "right" });

    y += 55;

    // ==========================================
    // INVOICE INFO BAR
    // ==========================================

    // Info bar background
    doc.rect(50, y, 510, 28).fillColor("#F3F4F6").fill();

    // Left side info
    doc.font("Helvetica").fontSize(9).fillColor(colors.text);

    // Row 1: Invoice #
    doc.text("Invoice #:", 60, y + 6);
    doc.text(orderNumber, 130, y + 6);

    // Row 1: Date
    doc.text("Date:", 320, y + 6);
    doc.text(
      new Date(createdAt || Date.now()).toLocaleDateString("en-PK"),
      370,
      y + 6,
    );

    // Row 2: Status
    doc.text("Status:", 60, y + 16);

    // Status with colored background
    const statusColors = {
      pending: "#F59E0B",
      confirmed: "#3B82F6",
      processing: "#8B0000",
      packed: "#6B7280",
      shipped: "#3B82F6",
      "out-for-delivery": "#F59E0B",
      delivered: "#10B981",
      cancelled: "#EF4444",
    };
    const statusBg = statusColors[safeStatus] || "#6B7280";

    // Status badge
    const statusX = 130;
    const statusWidth = 80;
    const statusHeight = 16;
    const statusY = y + 5;

    doc
      .rect(statusX, statusY, statusWidth, statusHeight)
      .fillColor(statusBg)
      .fill();
    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(safeStatus.toUpperCase(), statusX + 10, statusY + 4);

    // Payment
    doc.text("Payment:", 320, y + 16);
    doc.text(safePaymentMethod.toUpperCase(), 370, y + 16);

    y += 40;

    // ==========================================
    // BILLING & SHIPPING - Two Columns
    // ==========================================

    // "BILL TO" label
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.primary)
      .text("BILL TO", 50, y);

    // Customer info - Left column
    const billY = y + 16;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(colors.text)
      .text(customer?.name || "N/A", 50, billY)
      .text(customer?.email || "N/A", 50, billY + 14)
      .text(customer?.phone || "N/A", 50, billY + 28);

    // "SHIP TO" - Right column
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.primary)
      .text("SHIP TO", 310, y);

    // Shipping address - Right column
    const shipY = y + 16;
    if (shippingAddress) {
      const addr = shippingAddress;
      let shipLineY = shipY;

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(colors.text)
        .text(addr.name || "N/A", 310, shipLineY);
      shipLineY += 14;

      if (addr.street) {
        doc.text(addr.street, 310, shipLineY);
        shipLineY += 14;
      }

      if (addr.area) {
        doc.text(addr.area, 310, shipLineY);
        shipLineY += 14;
      }

      const cityState = [addr.city || "", addr.state || "", addr.zipCode || ""]
        .filter(Boolean)
        .join(", ");

      if (cityState) {
        doc.text(cityState, 310, shipLineY);
        shipLineY += 14;
      }

      doc.text(addr.country || "Pakistan", 310, shipLineY);
    }

    y += 110;

    // ==========================================
    // ITEMS TABLE
    // ==========================================

    // Table Header Background
    doc.rect(50, y, 510, 22).fillColor(colors.primary).fill();

    // Table Header Text
    doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(8);

    const colX = {
      product: 60,
      size: 200,
      qty: 260,
      price: 330,
      total: 420,
    };

    doc.text("PRODUCT", colX.product, y + 5);
    doc.text("SIZE", colX.size, y + 5);
    doc.text("QTY", colX.qty, y + 5);
    doc.text("PRICE", colX.price, y + 5);
    doc.text("TOTAL", colX.total, y + 5);

    y += 25;

    // ==========================================
    // TABLE ROWS
    // ==========================================

    const itemsArray = items || [];
    let rowY = y;

    // Limit to 6 items to fit on one page
    const maxItems = Math.min(itemsArray.length, 6);

    for (let i = 0; i < maxItems; i++) {
      const item = itemsArray[i];

      // Row background (alternating)
      if (i % 2 === 0) {
        doc
          .rect(50, rowY - 2, 510, 28)
          .fillColor(colors.lightBg)
          .fill();
      }

      const itemPrice = this.safeNumber(item.price);
      const itemDiscount = this.safeNumber(item.discount);
      const itemTotal = this.safeNumber(item.total);
      const itemQuantity = item.quantity || 1;
      const discountedPrice = itemPrice - itemDiscount;

      // Product Name
      const productName = item.name || "Unknown";
      const displayName =
        productName.length > 20
          ? productName.substring(0, 17) + "..."
          : productName;

      doc
        .fillColor(colors.text)
        .font("Helvetica")
        .fontSize(8.5)
        .text(displayName, colX.product, rowY + 2, { width: 130 });

      // Brand (smaller text)
      if (item.brand) {
        doc
          .font("Helvetica-Oblique")
          .fontSize(6.5)
          .fillColor(colors.lightText)
          .text(item.brand, colX.product, rowY + 13, { width: 130 });
      }

      // Size
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(colors.text)
        .text(item.size || "N/A", colX.size, rowY + 5, { width: 50 });

      // Quantity
      doc.text(itemQuantity.toString(), colX.qty, rowY + 5, {
        align: "center",
        width: 40,
      });

      // Price with discount
      if (itemDiscount > 0) {
        // Original price (strikethrough)
        const priceText = this.formatCurrency(itemPrice);
        doc
          .font("Helvetica-Oblique")
          .fontSize(7)
          .fillColor(colors.lightText)
          .text(priceText, colX.price, rowY + 1, {
            width: 70,
            align: "center",
          });

        // Draw strikethrough line
        const priceWidth = doc.widthOfString(priceText);
        const priceX = colX.price + (70 - priceWidth) / 2;
        doc
          .moveTo(priceX, rowY + 6)
          .lineTo(priceX + priceWidth, rowY + 6)
          .strokeColor(colors.lightText)
          .lineWidth(0.5)
          .stroke();

        // Discounted price
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(colors.green)
          .text(this.formatCurrency(discountedPrice), colX.price, rowY + 10, {
            width: 70,
            align: "center",
          });
      } else {
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor(colors.text)
          .text(this.formatCurrency(itemPrice), colX.price, rowY + 5, {
            width: 70,
            align: "center",
          });
      }

      // Total
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(colors.primary)
        .text(this.formatCurrency(itemTotal), colX.total, rowY + 5, {
          width: 80,
          align: "right",
        });

      rowY += 30;
    }

    // If there are more items, show count
    if (itemsArray.length > maxItems) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor(colors.lightText)
        .text(
          `+ ${itemsArray.length - maxItems} more items...`,
          colX.product,
          rowY + 4,
        );
      rowY += 20;
    }

    y = rowY + 25;

    // ==========================================
    // TOTALS SECTION
    // ==========================================

    // Divider line
    const totalDividerY = y;
    doc
      .moveTo(300, totalDividerY)
      .lineTo(560, totalDividerY)
      .strokeColor(colors.border)
      .lineWidth(0.5)
      .stroke();

    let totalY = y + 10;

    // Subtotal
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(colors.text)
      .text("Subtotal", 350, totalY, { align: "right", width: 120 })
      .text(this.formatCurrency(safeSubtotal), 480, totalY, {
        align: "right",
        width: 80,
      });
    totalY += 18;

    // Product Discount
    if (safeProductDiscount > 0) {
      doc
        .fillColor(colors.green)
        .text("Product Discount", 350, totalY, { align: "right", width: 120 })
        .text(`- ${this.formatCurrency(safeProductDiscount)}`, 480, totalY, {
          align: "right",
          width: 80,
        });
      totalY += 18;
    }

    // Coupon Discount
    if (safeCouponDiscount > 0 && coupon?.code) {
      doc
        .fillColor(colors.red)
        .text(`Coupon (${coupon.code})`, 350, totalY, {
          align: "right",
          width: 120,
        })
        .text(`- ${this.formatCurrency(safeCouponDiscount)}`, 480, totalY, {
          align: "right",
          width: 80,
        });
      totalY += 18;
    }

    // Delivery Fee
    doc
      .fillColor(colors.text)
      .text("Delivery Fee", 350, totalY, { align: "right", width: 120 })
      .text(
        safeShipping === 0 ? "FREE" : this.formatCurrency(safeShipping),
        480,
        totalY,
        { align: "right", width: 80 },
      );
    totalY += 22;

    // ==========================================
    // GRAND TOTAL
    // ==========================================

    // Grand Total Box
    const boxY = totalY;
    doc.rect(340, boxY, 220, 30).fillColor(colors.gold).fill();

    doc
      .fillColor(colors.white)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("GRAND TOTAL", 370, boxY + 6)
      .text(this.formatCurrency(safeTotal), 540, boxY + 6, { align: "right" });

    totalY = boxY + 40;

    // ==========================================
    // COUPON INFO (if applied)
    // ==========================================

    if (coupon?.code) {
      // Light yellow background
      doc.rect(50, totalY, 510, 20).fillColor("#FEF3C7").fill();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.text)
        .text(
          `🎫 Coupon "${coupon.code}" applied - ${coupon.type === "percentage" ? `${coupon.discount}% off` : `${this.formatCurrency(coupon.discount)} off`}`,
          60,
          totalY + 4,
        );
      totalY += 30;
    }

    // ==========================================
    // FOOTER
    // ==========================================

    // Ensure footer is at the bottom
    const footerY = Math.max(totalY + 15, 760);

    // Divider line
    doc
      .moveTo(50, footerY)
      .lineTo(560, footerY)
      .strokeColor(colors.gold)
      .lineWidth(1)
      .stroke();

    // Footer text
    const footerTextY = footerY + 10;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(colors.lightText)
      .text(
        "Thank you for choosing Elegance Perfumes. Your satisfaction is our priority.",
        50,
        footerTextY,
        { align: "center", width: 510 },
      );

    doc.text(
      "📧 elegance.myperfume@gmail.com  |  📞 +923199457143  |  🌐 www.elegance.pk",
      50,
      footerTextY + 14,
      { align: "center", width: 510 },
    );

    doc
      .font("Helvetica-Oblique")
      .fontSize(7)
      .text(
        `Generated: ${new Date().toLocaleString("en-PK")}`,
        50,
        footerTextY + 28,
        { align: "center", width: 510 },
      );
  }

  async getInvoice(orderNumber) {
    try {
      const files = fs.readdirSync(this.invoiceDir);
      const invoiceFile = files.find((f) => f.includes(orderNumber));

      if (!invoiceFile) {
        throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
      }

      const filePath = path.join(this.invoiceDir, invoiceFile);
      const fileContent = fs.readFileSync(filePath);

      return {
        fileName: invoiceFile,
        filePath,
        fileContent,
        contentType: "application/pdf",
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Invoice retrieval failed", {
        orderNumber,
        error: error.message,
      });
      throw new AppError(
        "Failed to retrieve invoice",
        500,
        "INVOICE_RETRIEVAL_FAILED",
      );
    }
  }

  async deleteInvoice(orderNumber) {
    try {
      const files = fs.readdirSync(this.invoiceDir);
      const invoiceFile = files.find((f) => f.includes(orderNumber));

      if (invoiceFile) {
        const filePath = path.join(this.invoiceDir, invoiceFile);
        fs.unlinkSync(filePath);
        logger.info("Invoice deleted", { orderNumber, fileName: invoiceFile });
      }

      return true;
    } catch (error) {
      logger.error("Invoice deletion failed", {
        orderNumber,
        error: error.message,
      });
      throw new AppError(
        "Failed to delete invoice",
        500,
        "INVOICE_DELETION_FAILED",
      );
    }
  }
}

module.exports = new InvoiceService();
