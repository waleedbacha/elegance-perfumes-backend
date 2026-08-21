/**
 * Formatters Utility
 * Data formatting functions
 */

const { CURRENCY, DATE_FORMATS } = require("./constants");

class Formatters {
  /**
   * Format currency
   */
  formatCurrency(amount, options = {}) {
    const {
      currency = CURRENCY.CODE,
      locale = CURRENCY.LOCALE,
      minFraction = CURRENCY.MINOR_UNITS,
      maxFraction = CURRENCY.MINOR_UNITS,
      symbol = CURRENCY.SYMBOL,
    } = options;

    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: minFraction,
      maximumFractionDigits: maxFraction,
    }).format(amount);

    // Replace currency symbol with custom symbol if provided
    return symbol ? formatted.replace(/[A-Z]{3}/, symbol) : formatted;
  }

  /**
   * Format price with discount
   */
  formatPriceWithDiscount(originalPrice, discountedPrice, discount = 0) {
    return {
      original: this.formatCurrency(originalPrice),
      discounted: this.formatCurrency(discountedPrice),
      discount: Math.round(discount),
      savings: this.formatCurrency(originalPrice - discountedPrice),
      savingsPercentage: Math.round(
        ((originalPrice - discountedPrice) / originalPrice) * 100,
      ),
    };
  }

  /**
   * Format date
   */
  formatDate(date, format = "display") {
    const d = new Date(date);
    const formats = {
      iso: DATE_FORMATS.ISO,
      date: DATE_FORMATS.DATE,
      time: DATE_FORMATS.TIME,
      datetime: DATE_FORMATS.DATETIME,
      display: DATE_FORMATS.DISPLAY_DATE,
      displayDatetime: DATE_FORMATS.DISPLAY_DATETIME,
      displayTime: DATE_FORMATS.DISPLAY_TIME,
    };

    const formatString = formats[format] || formats.display;

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fullMonths = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const monthName = months[d.getMonth()];
    const fullMonthName = fullMonths[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const seconds = d.getSeconds().toString().padStart(2, "0");

    return formatString
      .replace("YYYY", year)
      .replace("MM", month)
      .replace("MMM", monthName)
      .replace("MMMM", fullMonthName)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return "Just now";
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else if (weeks < 4) {
      return `${weeks}w ago`;
    } else if (months < 12) {
      return `${months}mo ago`;
    } else {
      return `${years}y ago`;
    }
  }

  /**
   * Format phone number
   */
  formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      return `+92${cleaned.substring(1)}`;
    }
    if (cleaned.length === 10) {
      return `+92${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Format address
   */
  formatAddress(address) {
    const parts = [
      address.name,
      address.street,
      address.area,
      address.landmark,
      `${address.city}, ${address.state} ${address.zipCode}`,
      address.country,
    ].filter(Boolean);
    return parts.join(", ");
  }

  /**
   * Format number with commas
   */
  formatNumber(number, locale = "en-PK") {
    return new Intl.NumberFormat(locale).format(number);
  }

  /**
   * Format percentage
   */
  formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Format duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Format product name with brand
   */
  formatProductName(product) {
    if (!product) return "";
    return `${product.brand || ""} ${product.name || ""}`.trim();
  }

  /**
   * Format order status
   */
  formatOrderStatus(status) {
    const statusMap = {
      pending: "Pending",
      confirmed: "Confirmed",
      processing: "Processing",
      packed: "Packed",
      shipped: "Shipped",
      "out-for-delivery": "Out for Delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned",
      refunded: "Refunded",
    };
    return statusMap[status] || status;
  }

  /**
   * Format payment method
   */
  formatPaymentMethod(method) {
    const methodMap = {
      cod: "Cash on Delivery",
      "bank-transfer": "Bank Transfer",
      jazzcash: "JazzCash",
      easypaisa: "EasyPaisa",
      online: "Online Payment",
      stripe: "Credit Card (Stripe)",
    };
    return methodMap[method] || method;
  }

  /**
   * Format shipping method
   */
  formatShippingMethod(method) {
    const methodMap = {
      standard: "Standard Shipping",
      express: "Express Shipping",
      "same-day": "Same Day Delivery",
    };
    return methodMap[method] || method;
  }

  /**
   * Format loyalty tier
   */
  formatLoyaltyTier(tier) {
    const tierMap = {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
    };
    return tierMap[tier] || tier;
  }

  /**
   * Format product category
   */
  formatCategory(category) {
    const categoryMap = {
      men: "Men's Collection",
      women: "Women's Collection",
      unisex: "Unisex Collection",
      niche: "Niche Collection",
    };
    return categoryMap[category] || category;
  }

  /**
   * Format scent notes
   */
  formatScentNotes(notes) {
    if (!notes) return "";
    if (Array.isArray(notes)) {
      return notes.join(" · ");
    }
    if (typeof notes === "object") {
      const parts = [];
      if (notes.top && notes.top.length)
        parts.push(`Top: ${notes.top.join(", ")}`);
      if (notes.middle && notes.middle.length)
        parts.push(`Middle: ${notes.middle.join(", ")}`);
      if (notes.base && notes.base.length)
        parts.push(`Base: ${notes.base.join(", ")}`);
      return parts.join(" | ");
    }
    return notes;
  }

  /**
   * Format rating stars
   */
  formatRatingStars(rating, max = 5) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const stars = [];

    for (let i = 0; i < full; i++) {
      stars.push("★");
    }
    if (half) {
      stars.push("½");
    }
    for (let i = stars.length; i < max; i++) {
      stars.push("☆");
    }

    return stars.join("");
  }

  /**
   * Format text with line breaks
   */
  formatTextWithBreaks(text) {
    if (!text) return "";
    return text.split("\n").join("<br>");
  }

  /**
   * Format URL
   */
  formatUrl(url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  }

  /**
   * Format meta title
   */
  formatMetaTitle(title, brand = "", maxLength = 60) {
    let formatted = title;
    if (brand) {
      formatted = `${brand} ${title}`;
    }
    if (formatted.length > maxLength) {
      return formatted.substring(0, maxLength - 3) + "...";
    }
    return formatted;
  }

  /**
   * Format meta description
   */
  formatMetaDescription(text, maxLength = 160) {
    if (text.length > maxLength) {
      return text.substring(0, maxLength - 3) + "...";
    }
    return text;
  }

  /**
   * Format error message
   */
  formatErrorMessage(error) {
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    if (error.error && error.error.message) return error.error.message;
    return "An error occurred";
  }

  /**
   * Format API response
   */
  formatApiResponse(success, data, message, statusCode = 200) {
    return {
      success,
      ...(data && { data }),
      ...(message && { message }),
      timestamp: new Date().toISOString(),
      statusCode,
    };
  }

  /**
   * Format paginated response
   */
  formatPaginatedResponse(data, pagination) {
    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
        hasNext: pagination.hasNext,
        hasPrev: pagination.hasPrev,
        nextPage: pagination.nextPage,
        prevPage: pagination.prevPage,
      },
    };
  }
}

module.exports = new Formatters();
