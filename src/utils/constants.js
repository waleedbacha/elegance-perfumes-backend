/**
 * Constants Utility
 * Centralized application constants
 */

module.exports = {
  // ==========================================
  // USER CONSTANTS
  // ==========================================
  USER_ROLES: {
    CUSTOMER: "customer",
    ADMIN: "admin",
    MANAGER: "manager",
    DELIVERY: "delivery",
  },

  USER_STATUS: {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    DEACTIVATED: "deactivated",
  },

  LOYALTY_TIERS: {
    BRONZE: "bronze",
    SILVER: "silver",
    GOLD: "gold",
    PLATINUM: "platinum",
  },

  LOYALTY_TIER_BENEFITS: {
    bronze: {
      pointsMultiplier: 1,
      discount: 5,
      freeShipping: false,
      prioritySupport: false,
      exclusiveAccess: false,
    },
    silver: {
      pointsMultiplier: 1.5,
      discount: 10,
      freeShipping: true,
      prioritySupport: false,
      exclusiveAccess: false,
    },
    gold: {
      pointsMultiplier: 2,
      discount: 15,
      freeShipping: true,
      prioritySupport: true,
      exclusiveAccess: false,
    },
    platinum: {
      pointsMultiplier: 3,
      discount: 20,
      freeShipping: true,
      prioritySupport: true,
      exclusiveAccess: true,
    },
  },

  // ==========================================
  // PRODUCT CONSTANTS
  // ==========================================
  PRODUCT_CATEGORIES: {
    MEN: "men",
    WOMEN: "women",
    UNISEX: "unisex",
    NICHE: "niche",
  },

  PRODUCT_STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    DRAFT: "draft",
    OUT_OF_STOCK: "out-of-stock",
    DISCONTINUED: "discontinued",
  },

  PRODUCT_TAGS: {
    BEST_SELLER: "best-seller",
    NEW_ARRIVAL: "new-arrival",
    LIMITED_EDITION: "limited-edition",
    ORGANIC: "organic",
    LUXURY: "luxury",
    SALE: "sale",
    PREMIUM: "premium",
  },

  SCENT_NOTES: {
    TOP: [
      "Bergamot",
      "Lemon",
      "Orange",
      "Grapefruit",
      "Lime",
      "Mandarin",
      "Neroli",
      "Lavender",
      "Mint",
      "Eucalyptus",
      "Thyme",
      "Rosemary",
      "Basil",
      "Coriander",
      "Cardamom",
    ],
    MIDDLE: [
      "Rose",
      "Jasmine",
      "Lavender",
      "Lily",
      "Peony",
      "Violet",
      "Orchid",
      "Ylang-Ylang",
      "Geranium",
      "Neroli",
      "Orange Blossom",
      "Tuberose",
      "Iris",
      "Carnation",
      "Clove",
    ],
    BASE: [
      "Vanilla",
      "Sandalwood",
      "Cedar",
      "Oud",
      "Patchouli",
      "Vetiver",
      "Amber",
      "Musk",
      "Benzoin",
      "Incense",
      "Myrrh",
      "Tonka Bean",
      "Leather",
      "Tobacco",
      "Oakmoss",
    ],
  },

  // ==========================================
  // ORDER CONSTANTS
  // ==========================================
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
    REFUNDED: "refunded",
  },

  ORDER_STATUS_FLOW: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["packed", "cancelled"],
    packed: ["shipped", "cancelled"],
    shipped: ["out-for-delivery", "delivered"],
    out_for_delivery: ["delivered", "returned"],
    delivered: ["returned"],
    cancelled: [],
    returned: ["refunded"],
    refunded: [],
  },

  // ==========================================
  // PAYMENT CONSTANTS
  // ==========================================
  PAYMENT_METHODS: {
    COD: "cod",
    BANK_TRANSFER: "bank-transfer",
    JAZZCASH: "jazzcash",
    EASYPAISA: "easypaisa",
    ONLINE: "online",
    STRIPE: "stripe",
  },

  PAYMENT_STATUS: {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
    PARTIALLY_REFUNDED: "partially-refunded",
  },

  // ==========================================
  // SHIPPING CONSTANTS
  // ==========================================
  SHIPPING_METHODS: {
    STANDARD: "standard",
    EXPRESS: "express",
    SAME_DAY: "same-day",
  },

  SHIPPING_PROVIDERS: {
    TCS: "tcs",
    LEOPARDS: "leopards",
    MNP: "mnp",
    POSTEX: "postex",
    RIDER: "rider",
  },

  // ==========================================
  // BANNER CONSTANTS
  // ==========================================
  BANNER_POSITIONS: {
    HERO: "hero",
    CATEGORY: "category",
    PROMO: "promo",
    SIDEBAR: "sidebar",
    FOOTER: "footer",
    POPUP: "popup",
  },

  BANNER_SECTIONS: {
    HOMEPAGE: "homepage",
    SHOP: "shop",
    CATEGORY: "category",
    PRODUCT: "product",
    CHECKOUT: "checkout",
  },

  // ==========================================
  // COUPON CONSTANTS
  // ==========================================
  COUPON_TYPES: {
    PERCENTAGE: "percentage",
    FIXED: "fixed",
  },

  COUPON_APPLICABILITY: {
    ALL: "all",
    SPECIFIC_PRODUCTS: "specific-products",
    SPECIFIC_CATEGORIES: "specific-categories",
    SPECIFIC_BRANDS: "specific-brands",
  },

  // ==========================================
  // REVIEW CONSTANTS
  // ==========================================
  REVIEW_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    FLAGGED: "flagged",
  },

  // ==========================================
  // NOTIFICATION CONSTANTS
  // ==========================================
  NOTIFICATION_TYPES: {
    ORDER: "order",
    PAYMENT: "payment",
    SHIPPING: "shipping",
    DELIVERY: "delivery",
    REVIEW: "review",
    PROMOTION: "promotion",
    NEWSLETTER: "newsletter",
    SYSTEM: "system",
    SECURITY: "security",
    LOYALTY: "loyalty",
    WISHLIST: "wishlist",
    STOCK: "stock",
    ADMIN: "admin",
  },

  NOTIFICATION_PRIORITY: {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
  },

  // ==========================================
  // CACHE CONSTANTS
  // ==========================================
  CACHE_KEYS: {
    PRODUCT_LIST: "products:list",
    PRODUCT_DETAIL: "products:detail",
    PRODUCT_CATEGORIES: "products:categories",
    PRODUCT_BRANDS: "products:brands",
    FEATURED_PRODUCTS: "products:featured",
    NEW_ARRIVALS: "products:new",
    BEST_SELLERS: "products:best-sellers",
    USER_SESSION: "user:session",
    CART: "cart",
    WISHLIST: "wishlist",
    RECOMMENDATIONS: "recommendations",
    DASHBOARD: "dashboard",
    BANNERS: "banners",
    COUPONS: "coupons",
  },

  CACHE_TTL: {
    PRODUCT_LIST: 300, // 5 minutes
    PRODUCT_DETAIL: 600, // 10 minutes
    PRODUCT_CATEGORIES: 3600, // 1 hour
    PRODUCT_BRANDS: 3600, // 1 hour
    FEATURED_PRODUCTS: 1800, // 30 minutes
    NEW_ARRIVALS: 1800, // 30 minutes
    BEST_SELLERS: 3600, // 1 hour
    USER_SESSION: 86400, // 24 hours
    CART: 3600, // 1 hour
    WISHLIST: 3600, // 1 hour
    RECOMMENDATIONS: 3600, // 1 hour
    DASHBOARD: 300, // 5 minutes
    BANNERS: 3600, // 1 hour
    COUPONS: 3600, // 1 hour
  },

  // ==========================================
  // PAGINATION CONSTANTS
  // ==========================================
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // ==========================================
  // UPLOAD CONSTANTS
  // ==========================================
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    MAX_IMAGES_PER_PRODUCT: 10,
    MAX_IMAGES_PER_REVIEW: 3,
    PRODUCT_IMAGE_FOLDER: "products",
    BANNER_IMAGE_FOLDER: "banners",
    REVIEW_IMAGE_FOLDER: "reviews",
    USER_AVATAR_FOLDER: "users",
  },

  // ==========================================
  // REGEX PATTERNS
  // ==========================================
  REGEX: {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PHONE: /^[\+]?[0-9]{10,15}$/,
    ZIP_CODE: /^\d{5}$/,
    PASSWORD:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  },

  // ==========================================
  // DATE FORMATS
  // ==========================================
  DATE_FORMATS: {
    ISO: "YYYY-MM-DDTHH:mm:ss.SSSZ",
    DATE: "YYYY-MM-DD",
    TIME: "HH:mm:ss",
    DATETIME: "YYYY-MM-DD HH:mm:ss",
    DISPLAY_DATE: "MMM DD, YYYY",
    DISPLAY_DATETIME: "MMM DD, YYYY HH:mm",
    DISPLAY_TIME: "hh:mm A",
  },

  // ==========================================
  // CURRENCY
  // ==========================================
  CURRENCY: {
    CODE: "PKR",
    SYMBOL: "₨",
    LOCALE: "en-PK",
    MINOR_UNITS: 2,
  },

  // ==========================================
  // TAX
  // ==========================================
  TAX: {
    RATE: 0.05, // 5% GST
    TYPE: "gst",
  },

  // ==========================================
  // RESPONSE MESSAGES
  // ==========================================
  MESSAGES: {
    // Success
    SUCCESS: "Operation successful",
    CREATED: "Resource created successfully",
    UPDATED: "Resource updated successfully",
    DELETED: "Resource deleted successfully",

    // Auth
    REGISTER_SUCCESS: "Registration successful",
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logged out successfully",
    EMAIL_VERIFIED: "Email verified successfully",
    PASSWORD_RESET_SENT: "Password reset link sent to email",
    PASSWORD_RESET_SUCCESS: "Password reset successful",
    PASSWORD_CHANGED: "Password changed successfully",

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
    TOKEN_EXPIRED: "Token expired",

    // Product
    PRODUCT_CREATED: "Product created successfully",
    PRODUCT_UPDATED: "Product updated successfully",
    PRODUCT_DELETED: "Product deleted successfully",

    // Order
    ORDER_CREATED: "Order created successfully",
    ORDER_UPDATED: "Order updated successfully",
    ORDER_CANCELLED: "Order cancelled successfully",

    // Cart
    CART_EMPTY: "Cart is empty",
    CART_UPDATED: "Cart updated successfully",
    CART_CLEARED: "Cart cleared successfully",

    // Coupon
    COUPON_APPLIED: "Coupon applied successfully",
    COUPON_REMOVED: "Coupon removed successfully",
    COUPON_INVALID: "Invalid coupon code",
    COUPON_EXPIRED: "Coupon has expired",
    COUPON_USED: "Coupon already used",

    // Inventory
    STOCK_UPDATED: "Stock updated successfully",
    STOCK_INSUFFICIENT: "Insufficient stock",
    STOCK_ADDED: "Stock added successfully",
    STOCK_DEDUCTED: "Stock deducted successfully",
  },

  // ==========================================
  // FEATURE FLAGS
  // ==========================================
  FEATURES: {
    ENABLE_EMAIL_VERIFICATION: true,
    ENABLE_SMS_VERIFICATION: false,
    ENABLE_PUSH_NOTIFICATIONS: false,
    ENABLE_SOCIAL_LOGIN: false,
    ENABLE_WISHLIST: true,
    ENABLE_WISHLIST_SHARING: false,
    ENABLE_REVIEWS: true,
    ENABLE_PRODUCT_COMPARISON: false,
    ENABLE_LIVE_CHAT: false,
    ENABLE_GIFT_WRAP: true,
    ENABLE_LOYALTY_PROGRAM: true,
    ENABLE_REFERRAL_PROGRAM: false,
    ENABLE_BULK_IMPORT: true,
    ENABLE_BULK_EXPORT: false,
    ENABLE_ANALYTICS: true,
    ENABLE_CACHE: true,
  },
};
