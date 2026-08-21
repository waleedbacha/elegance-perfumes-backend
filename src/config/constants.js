/**
 * Application Constants
 * Centralized configuration values
 */

module.exports = {
  // User Roles
  USER_ROLES: {
    CUSTOMER: "customer",
    ADMIN: "admin",
    MANAGER: "manager",
    DELIVERY: "delivery",
  },

  // User Status
  USER_STATUS: {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    DEACTIVATED: "deactivated",
  },

  // Loyalty Tiers
  LOYALTY_TIERS: {
    BRONZE: "bronze",
    SILVER: "silver",
    GOLD: "gold",
    PLATINUM: "platinum",
  },

  // Order Status
  ORDER_STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    PROCESSING: "processing",
    PACKED: "packed",
    SHIPPED: "shipped",
    OUT_FOR_DELIVERY: "out-for-delivery",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    RETURNED: "returned",
  },

  // Payment Methods
  PAYMENT_METHODS: {
    COD: "cod",
    BANK_TRANSFER: "bank-transfer",
    JAZZCASH: "jazzcash",
    EASYPAISA: "easypaisa",
    ONLINE: "online",
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
  },

  // Product Categories
  PRODUCT_CATEGORIES: {
    MEN: "men",
    WOMEN: "women",
    UNISEX: "unisex",
    NICHE: "niche",
  },

  // Product Status
  PRODUCT_STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    DRAFT: "draft",
    OUT_OF_STOCK: "out-of-stock",
    DISCONTINUED: "discontinued",
  },

  // Product Tags
  PRODUCT_TAGS: {
    BEST_SELLER: "best-seller",
    NEW_ARRIVAL: "new-arrival",
    LIMITED_EDITION: "limited-edition",
    ORGANIC: "organic",
    LUXURY: "luxury",
    PREMIUM: "premium",
  },

  // Banner Positions
  BANNER_POSITIONS: {
    HERO: "hero",
    CATEGORY: "category",
    PROMO: "promo",
    SIDEBAR: "sidebar",
    FOOTER: "footer",
  },

  // Coupon Types
  COUPON_TYPES: {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
  },

  // Inventory Status
  INVENTORY_STATUS: {
    IN_STOCK: "in-stock",
    LOW_STOCK: "low-stock",
    OUT_OF_STOCK: "out-of-stock",
    DISCONTINUED: "discontinued",
  },

  // Shipping Methods
  SHIPPING_METHODS: {
    STANDARD: "standard",
    EXPRESS: "express",
    SAME_DAY: "same-day",
  },

  // Review Status
  REVIEW_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },

  // Cache Keys
  CACHE_KEYS: {
    PRODUCT_LIST: "products:list",
    PRODUCT_DETAIL: "products:detail",
    CATEGORIES: "categories",
    BRANDS: "brands",
    FEATURED_PRODUCTS: "products:featured",
    NEW_ARRIVALS: "products:new",
    BEST_SELLERS: "products:best-sellers",
    USER_SESSION: "user:session",
  },

  // Cache TTL (seconds)
  CACHE_TTL: {
    PRODUCT_LIST: 300, // 5 minutes
    PRODUCT_DETAIL: 600, // 10 minutes
    CATEGORIES: 3600, // 1 hour
    BRANDS: 3600, // 1 hour
    FEATURED_PRODUCTS: 1800, // 30 minutes
    USER_SESSION: 86400, // 24 hours
  },

  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    MAX_IMAGES_PER_PRODUCT: 10,
    MAX_IMAGES_PER_REVIEW: 3,
  },

  // Response Messages
  MESSAGES: {
    // Auth
    REGISTER_SUCCESS: "Registration successful",
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logged out successfully",
    EMAIL_VERIFIED: "Email verified successfully",
    PASSWORD_RESET_SENT: "Password reset link sent to email",
    PASSWORD_RESET_SUCCESS: "Password reset successful",

    // Product
    PRODUCT_CREATED: "Product created successfully",
    PRODUCT_UPDATED: "Product updated successfully",
    PRODUCT_DELETED: "Product deleted successfully",
    PRODUCTS_IMPORTED: "Products imported successfully",

    // Order
    ORDER_CREATED: "Order created successfully",
    ORDER_UPDATED: "Order updated successfully",
    ORDER_CANCELLED: "Order cancelled successfully",

    // Errors
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "Forbidden access",
    NOT_FOUND: "Resource not found",
    VALIDATION_ERROR: "Validation error",
    SERVER_ERROR: "Internal server error",
    DUPLICATE_ENTRY: "Duplicate entry found",
    INVALID_CREDENTIALS: "Invalid email or password",
    ACCOUNT_LOCKED: "Account locked due to multiple failed attempts",
    INVALID_TOKEN: "Invalid or expired token",
  },
};
