/**
 * Helpers Utility
 * Common helper functions
 */

const crypto = require("crypto");
const slugify = require("slugify");
const { REGEX } = require("./constants");

class Helpers {
  /**
   * Generate random string
   */
  generateRandomString(length = 8) {
    return crypto.randomBytes(length).toString("hex").substring(0, length);
  }

  /**
   * Generate unique ID
   */
  generateUniqueId(prefix = "") {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  }

  /**
   * Generate slug from string
   */
  generateSlug(text) {
    return slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
      replacement: "-",
    });
  }

  /**
   * Validate email
   */
  isValidEmail(email) {
    return REGEX.EMAIL.test(email);
  }

  /**
   * Validate phone number
   */
  isValidPhone(phone) {
    return REGEX.PHONE.test(phone);
  }

  /**
   * Validate ZIP code
   */
  isValidZipCode(zip) {
    return REGEX.ZIP_CODE.test(zip);
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    if (password.length < 8) {
      return {
        valid: false,
        message: "Password must be at least 8 characters",
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one lowercase letter",
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one uppercase letter",
      };
    }
    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        message: "Password must contain at least one number",
      };
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return {
        valid: false,
        message:
          "Password must contain at least one special character (!@#$%^&*)",
      };
    }
    return { valid: true };
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = "PKR") {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date, format = "MMM DD, YYYY") {
    const d = new Date(date);
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
    const day = d.getDate().toString().padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const seconds = d.getSeconds().toString().padStart(2, "0");

    return format
      .replace("YYYY", year)
      .replace("MMM", month)
      .replace("MM", (d.getMonth() + 1).toString().padStart(2, "0"))
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * Get time ago
   */
  timeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }

  /**
   * Truncate text
   */
  truncateText(text, length = 100, suffix = "...") {
    if (text.length <= length) return text;
    return text.substring(0, length) + suffix;
  }

  /**
   * Capitalize first letter
   */
  capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Title case
   */
  titleCase(text) {
    return text
      .split(" ")
      .map((word) => this.capitalize(word))
      .join(" ");
  }

  /**
   * Snake case to camel case
   */
  snakeToCamel(text) {
    return text.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Camel case to snake case
   */
  camelToSnake(text) {
    return text.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Pick properties from object
   */
  pick(obj, keys) {
    const result = {};
    keys.forEach((key) => {
      if (obj && obj.hasOwnProperty(key)) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * Omit properties from object
   */
  omit(obj, keys) {
    const result = { ...obj };
    keys.forEach((key) => {
      delete result[key];
    });
    return result;
  }

  /**
   * Check if object is empty
   */
  isEmpty(obj) {
    return !obj || Object.keys(obj).length === 0;
  }

  /**
   * Get nested object value safely
   */
  getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split(".");
    let value = obj;
    for (const key of keys) {
      if (!value || typeof value !== "object" || !(key in value)) {
        return defaultValue;
      }
      value = value[key];
    }
    return value;
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(part, total) {
    if (total === 0) return 0;
    return (part / total) * 100;
  }

  /**
   * Calculate discount
   */
  calculateDiscount(price, discount) {
    return price - (price * discount) / 100;
  }

  /**
   * Round to nearest decimal
   */
  roundTo(value, decimals = 2) {
    return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
  }

  /**
   * Generate pagination metadata
   */
  getPagination(page = 1, limit = 20, total = 0) {
    const totalPages = Math.ceil(total / limit);
    return {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    };
  }

  /**
   * Get pagination skip value
   */
  getSkip(page = 1, limit = 20) {
    return (page - 1) * limit;
  }

  /**
   * Sort array by field
   */
  sortByField(array, field, order = "asc") {
    return array.sort((a, b) => {
      const aVal = this.getNestedValue(a, field);
      const bVal = this.getNestedValue(b, field);
      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
  }

  /**
   * Group array by field
   */
  groupBy(array, field) {
    return array.reduce((result, item) => {
      const key = this.getNestedValue(item, field);
      if (!result[key]) result[key] = [];
      result[key].push(item);
      return result;
    }, {});
  }

  /**
   * Unique array
   */
  unique(array) {
    return [...new Set(array)];
  }

  /**
   * Shuffle array
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Sleep/delay
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry async function
   */
  async retry(fn, retries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await this.sleep(delay * Math.pow(2, i));
        }
      }
    }
    throw lastError;
  }

  /**
   * Parse JSON safely
   */
  safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Stringify JSON safely
   */
  safeJsonStringify(obj, defaultValue = "") {
    try {
      return JSON.stringify(obj);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace("www.", "");
    } catch {
      return null;
    }
  }

  /**
   * Mask sensitive data
   */
  maskSensitive(data, visible = 4) {
    if (!data) return "";
    const str = String(data);
    if (str.length <= visible) return "*".repeat(str.length);
    return (
      str.slice(0, visible) + "*".repeat(Math.min(str.length - visible, 8))
    );
  }

  /**
   * Generate order number
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Generate transaction ID
   */
  generateTransactionId(prefix = "TXN") {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Check if string is valid JSON
   */
  isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension
   */
  getFileExtension(filename) {
    return filename.split(".").pop();
  }

  /**
   * Get file name without extension
   */
  getFileNameWithoutExtension(filename) {
    return filename.substring(0, filename.lastIndexOf("."));
  }

  /**
   * Convert bytes to human readable
   */
  bytesToHuman(bytes) {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

module.exports = new Helpers();
