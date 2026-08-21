/**
 * Validation Schemas
 * Joi validation schemas for request validation
 */

const Joi = require("joi");

class ValidationSchemas {
  constructor() {
    this.objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
    this.email = Joi.string().email().lowercase().trim();
    this.phone = Joi.string()
      .pattern(/^[\+]?[0-9]{10,15}$/)
      .custom((value, helpers) => {
        // Auto-formats to WhatsApp format (923459270471)
        let cleaned = value.replace(/\D/g, "");
        if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
        if (cleaned.length > 0 && !cleaned.startsWith("92")) {
          cleaned = `92${cleaned}`;
        }
        if (cleaned.length === 12 && cleaned.startsWith("92")) {
          return cleaned;
        }
        return helpers.error("any.invalid");
      })
      .messages({
        "any.invalid": "Please enter a valid phone number (e.g., 923459270471)",
      });
    this.password = Joi.string().min(8).max(100);
    this.url = Joi.string().uri();
    this.slug = Joi.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    this.positiveNumber = Joi.number().positive();
    this.nonNegativeNumber = Joi.number().min(0);
  }

  // ==========================================
  // AUTH SCHEMAS
  // ==========================================

  register = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: this.email.required(),
    phone: this.phone.required(),
    password: this.password.required(),
    passwordConfirm: Joi.string().valid(Joi.ref("password")).required(),
  });

  login = Joi.object({
    email: this.email,
    phone: this.phone,
    password: Joi.string().required(),
  }).or("email", "phone");

  forgotPassword = Joi.object({
    email: this.email.required(),
  });

  resetPassword = Joi.object({
    password: this.password.required(),
    passwordConfirm: Joi.string().valid(Joi.ref("password")).required(),
  });

  changePassword = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: this.password.required(),
    newPasswordConfirm: Joi.string().valid(Joi.ref("newPassword")).required(),
  });

  refreshToken = Joi.object({
    refreshToken: Joi.string().required(),
  });

  // ==========================================
  // USER SCHEMAS
  // ==========================================

  updateProfile = Joi.object({
    name: Joi.string().min(2).max(50),
    phone: this.phone,
    dateOfBirth: Joi.date(),
    gender: Joi.string().valid("male", "female", "other", "prefer-not-to-say"),
    preferences: Joi.object({
      receiveNewsletter: Joi.boolean(),
      receivePromotions: Joi.boolean(),
      receiveOrderUpdates: Joi.boolean(),
      language: Joi.string().valid("en", "ur"),
    }),
  });

  address = Joi.object({
    name: Joi.string().required(),
    phone: this.phone.required(),
    street: Joi.string().required(),
    area: Joi.string(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string()
      .regex(/^\d{5}$/)
      .required(),
    country: Joi.string().default("Pakistan"),
    landmark: Joi.string(),
    isDefault: Joi.boolean().default(false),
    type: Joi.string().valid("home", "work", "other").default("home"),
    deliveryInstructions: Joi.string(),
  });

  // ==========================================
  // PRODUCT SCHEMAS
  // ==========================================

  createProduct = Joi.object({
    name: Joi.string().required(),
    brand: Joi.string().required(),
    category: Joi.string().valid("men", "women", "unisex", "niche").required(),
    description: Joi.string().min(50).required(),
    shortDescription: Joi.string().max(200),
    price: this.positiveNumber.required(),
    comparePrice: this.positiveNumber,
    discount: Joi.number().min(0).max(100).default(0),
    sizes: Joi.array().items(
      Joi.object({
        size: Joi.string()
          .valid("15ml", "30ml", "50ml", "100ml", "150ml", "200ml")
          .required(),
        stock: this.nonNegativeNumber.required(),
        price: this.positiveNumber,
        sku: Joi.string(),
      }),
    ),
    notes: Joi.object({
      top: Joi.array().items(Joi.string()),
      middle: Joi.array().items(Joi.string()),
      base: Joi.array().items(Joi.string()),
      description: Joi.string(),
    }),
    longevity: Joi.number().min(1).max(24),
    intensity: Joi.string().valid("soft", "moderate", "intense", "extreme"),
    sillage: Joi.string().valid("subtle", "moderate", "strong", "heavy"),
    season: Joi.array().items(
      Joi.string().valid("spring", "summer", "fall", "winter", "all-season"),
    ),
    occasion: Joi.array().items(
      Joi.string().valid(
        "everyday",
        "office",
        "party",
        "date",
        "wedding",
        "formal",
      ),
    ),
    status: Joi.string().valid("active", "inactive", "draft", "out-of-stock"),
    isFeatured: Joi.boolean(),
    isNew: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    metaKeywords: Joi.array().items(Joi.string()),
  });

  updateProduct = Joi.object({
    name: Joi.string(),
    brand: Joi.string(),
    category: Joi.string().valid("men", "women", "unisex", "niche"),
    description: Joi.string().min(50),
    shortDescription: Joi.string().max(200),
    price: this.positiveNumber,
    comparePrice: this.positiveNumber,
    discount: Joi.number().min(0).max(100),
    sizes: Joi.array().items(
      Joi.object({
        size: Joi.string().valid(
          "15ml",
          "30ml",
          "50ml",
          "100ml",
          "150ml",
          "200ml",
        ),
        stock: this.nonNegativeNumber,
        price: this.positiveNumber,
        sku: Joi.string(),
      }),
    ),
    notes: Joi.object({
      top: Joi.array().items(Joi.string()),
      middle: Joi.array().items(Joi.string()),
      base: Joi.array().items(Joi.string()),
      description: Joi.string(),
    }),
    longevity: Joi.number().min(1).max(24),
    intensity: Joi.string().valid("soft", "moderate", "intense", "extreme"),
    sillage: Joi.string().valid("subtle", "moderate", "strong", "heavy"),
    season: Joi.array().items(
      Joi.string().valid("spring", "summer", "fall", "winter", "all-season"),
    ),
    occasion: Joi.array().items(
      Joi.string().valid(
        "everyday",
        "office",
        "party",
        "date",
        "wedding",
        "formal",
      ),
    ),
    status: Joi.string().valid("active", "inactive", "draft", "out-of-stock"),
    isFeatured: Joi.boolean(),
    isNew: Joi.boolean(),
    tags: Joi.array().items(Joi.string()),
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    metaKeywords: Joi.array().items(Joi.string()),
  });

  // ==========================================
  // ORDER SCHEMAS
  // ==========================================

  createOrder = Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: this.objectId.required(),
          size: Joi.string().required(),
          quantity: Joi.number().min(1).max(99).required(),
        }),
      )
      .min(1)
      .required(),
    shippingAddress: this.address.required(),
    billingAddress: Joi.object({
      sameAsShipping: Joi.boolean().default(true),
      name: Joi.string(),
      phone: this.phone,
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string().regex(/^\d{5}$/),
      country: Joi.string(),
    }),
    paymentMethod: Joi.string()
      .valid("cod", "bank-transfer", "jazzcash", "easypaisa")
      .required(),
    couponCode: Joi.string(),
    notes: Joi.string(),
    giftMessage: Joi.string().max(500),
    isGift: Joi.boolean(),
    giftWrap: Joi.boolean(),
    source: Joi.string().valid("website", "whatsapp", "admin", "mobile-app"),
  });

  updateOrderStatus = Joi.object({
    status: Joi.string()
      .valid(
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out-for-delivery",
        "delivered",
        "cancelled",
      )
      .required(),
    note: Joi.string(),
  });

  // ==========================================
  // REVIEW SCHEMAS
  // ==========================================

  createReview = Joi.object({
    productId: this.objectId.required(),
    rating: Joi.number().min(1).max(5).required(),
    title: Joi.string().max(100),
    comment: Joi.string().min(10).max(1000).required(),
    pros: Joi.array().items(Joi.string()),
    cons: Joi.array().items(Joi.string()),
  });

  updateReview = Joi.object({
    rating: Joi.number().min(1).max(5),
    title: Joi.string().max(100),
    comment: Joi.string().min(10).max(1000),
    pros: Joi.array().items(Joi.string()),
    cons: Joi.array().items(Joi.string()),
  });

  // ==========================================
  // CART SCHEMAS
  // ==========================================

  addToCart = Joi.object({
    productId: this.objectId.required(),
    size: Joi.string().required(),
    quantity: Joi.number().min(1).max(99).default(1),
  });

  updateCartItem = Joi.object({
    productId: this.objectId.required(),
    size: Joi.string().required(),
    quantity: Joi.number().min(0).max(99).required(),
  });

  applyCoupon = Joi.object({
    code: Joi.string().required(),
  });

  // ==========================================
  // COUPON SCHEMAS  // ==========================================

  createCoupon = Joi.object({
    code: Joi.string()
      .min(4)
      .max(20)
      .regex(/^[A-Z0-9]+$/)
      .uppercase()
      .required(),
    name: Joi.string().required(),
    description: Joi.string().max(500),
    discountType: Joi.string().valid("percentage", "fixed").required(),
    discountValue: Joi.number().positive().required(),
    maxDiscount: Joi.number().positive(),
    minOrderAmount: Joi.number().min(0).default(0),
    validFrom: Joi.date().required(),
    validUntil: Joi.date().greater(Joi.ref("validFrom")).required(),
    usageLimit: Joi.number().min(1).default(1),
    perUserLimit: Joi.number().min(1).default(1),
    applicableProducts: Joi.array().items(this.objectId),
    applicableCategories: Joi.array().items(Joi.string()),
    applicableBrands: Joi.array().items(Joi.string()),
    excludedProducts: Joi.array().items(this.objectId),
    excludedCategories: Joi.array().items(Joi.string()),
    userRestrictions: Joi.object({
      isFirstOrder: Joi.boolean().default(false),
      minOrderCount: Joi.number().min(0).default(0),
      userTiers: Joi.array().items(
        Joi.string().valid("bronze", "silver", "gold", "platinum"),
      ),
      specificUsers: Joi.array().items(this.objectId),
    }),
  });

  // ==========================================
  // INVENTORY SCHEMAS
  // ==========================================

  updateInventory = Joi.object({
    quantity: Joi.number().min(0),
    lowStockThreshold: Joi.number().min(0),
    locations: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        address: Joi.object({
          street: Joi.string(),
          city: Joi.string(),
          state: Joi.string(),
          zipCode: Joi.string().regex(/^\d{5}$/),
          country: Joi.string(),
        }),
        quantity: Joi.number().min(0).required(),
        isPrimary: Joi.boolean().default(false),
        notes: Joi.string(),
      }),
    ),
    suppliers: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        contact: Joi.string(),
        email: Joi.string().email(),
        phone: Joi.string(),
        leadTime: Joi.number().min(0).default(7),
        costPrice: Joi.number().min(0),
        minimumOrder: Joi.number().min(1).default(1),
        isPreferred: Joi.boolean().default(false),
        notes: Joi.string(),
      }),
    ),
  });

  // ==========================================
  // BANNER SCHEMAS
  // ==========================================

  createBanner = Joi.object({
    title: Joi.string().required(),
    subtitle: Joi.string(),
    description: Joi.string().max(500),
    link: Joi.object({
      url: Joi.string().uri(),
      openInNewTab: Joi.boolean().default(false),
      text: Joi.string(),
    }),
    position: Joi.string()
      .valid("hero", "category", "promo", "sidebar", "footer", "popup")
      .required(),
    order: Joi.number().min(0).default(0),
    section: Joi.string()
      .valid("homepage", "shop", "category", "product", "checkout")
      .default("homepage"),
    visibility: Joi.object({
      devices: Joi.array().items(
        Joi.string().valid("desktop", "tablet", "mobile"),
      ),
      userSegments: Joi.array().items(
        Joi.string().valid(
          "new-users",
          "returning-users",
          "premium-users",
          "all",
        ),
      ),
      pages: Joi.array().items(Joi.string()),
    }),
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref("startDate")),
    scheduleType: Joi.string()
      .valid("always", "scheduled", "recurring")
      .default("always"),
    recurring: Joi.string().valid("daily", "weekly", "monthly", "yearly"),
    recurringDays: Joi.array().items(Joi.number().min(0).max(6)),
    status: Joi.string()
      .valid("active", "inactive", "scheduled")
      .default("inactive"),
    style: Joi.object({
      backgroundColor: Joi.string(),
      textColor: Joi.string(),
      buttonColor: Joi.string(),
      buttonTextColor: Joi.string(),
      alignment: Joi.string().valid("left", "center", "right"),
      overlay: Joi.object({
        enabled: Joi.boolean().default(false),
        color: Joi.string(),
        opacity: Joi.number().min(0).max(1).default(0.5),
      }),
      customCSS: Joi.string(),
    }),
    targeting: Joi.object({
      categories: Joi.array().items(Joi.string()),
      brands: Joi.array().items(Joi.string()),
      products: Joi.array().items(this.objectId),
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().min(0),
    }),
  });

  // ==========================================
  // PAYMENT SCHEMAS
  // ==========================================

  initiatePayment = Joi.object({
    orderId: this.objectId.required(),
    paymentMethod: Joi.string()
      .valid("cod", "bank-transfer", "jazzcash", "easypaisa")
      .required(),
  });

  verifyPayment = Joi.object({
    orderId: this.objectId.required(),
    transactionId: Joi.string().required(),
    paymentMethod: Joi.string().valid(
      "cod",
      "bank-transfer",
      "jazzcash",
      "easypaisa",
    ),
  });

  processRefund = Joi.object({
    orderId: this.objectId.required(),
    amount: Joi.number().positive().required(),
    reason: Joi.string(),
  });

  // ==========================================
  // NOTIFICATION SCHEMAS
  // ==========================================

  sendNotification = Joi.object({
    userId: this.objectId.required(),
    type: Joi.string()
      .valid(
        "order",
        "payment",
        "shipping",
        "delivery",
        "review",
        "promotion",
        "newsletter",
        "system",
        "security",
        "loyalty",
        "wishlist",
        "stock",
        "admin",
      )
      .required(),
    subtype: Joi.string(),
    title: Joi.string().required(),
    message: Joi.string().required(),
    data: Joi.object(),
    action: Joi.object({
      label: Joi.string(),
      url: Joi.string(),
      method: Joi.string().valid("GET", "POST", "PUT", "DELETE").default("GET"),
    }),
    priority: Joi.string()
      .valid("low", "medium", "high", "urgent")
      .default("medium"),
    expiresAt: Joi.date(),
    sendEmail: Joi.boolean().default(false),
    sendSms: Joi.boolean().default(false),
  });

  // ==========================================
  // ANALYTICS SCHEMAS
  // ==========================================

  trackEvent = Joi.object({
    type: Joi.string()
      .valid(
        "pageview",
        "product-view",
        "search",
        "add-to-cart",
        "remove-from-cart",
        "checkout",
        "order",
        "payment",
        "user-registration",
        "user-login",
        "user-logout",
        "banner-click",
        "coupon-use",
        "review",
        "share",
        "wishlist-add",
        "wishlist-remove",
        "click",
        "conversion",
      )
      .required(),
    data: Joi.object(),
    reference: Joi.object({
      model: Joi.string().valid(
        "Product",
        "Order",
        "Banner",
        "Coupon",
        "User",
        "Category",
      ),
      id: this.objectId,
    }),
    source: Joi.string().valid(
      "direct",
      "organic",
      "social",
      "email",
      "referral",
      "whatsapp",
      "admin",
    ),
    medium: Joi.string().valid(
      "web",
      "mobile",
      "email",
      "social",
      "search",
      "whatsapp",
    ),
    campaign: Joi.string(),
    utm: Joi.object({
      source: Joi.string(),
      medium: Joi.string(),
      campaign: Joi.string(),
      term: Joi.string(),
      content: Joi.string(),
    }),
  });
}

module.exports = new ValidationSchemas();
