/**
 * Interfaces
 * Type definitions for the application
 */

// ==========================================
// USER INTERFACES
// ==========================================

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  isVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  profilePicture?: {
    url: string;
    publicId: string;
  };
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  addresses: IAddress[];
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  totalSpent: number;
  orderCount: number;
  pointsHistory: IPointsHistory[];
  preferences: IPreferences;
  refreshTokens: IRefreshToken[];
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  verificationToken?: string;
  verificationExpiry?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  lastPasswordChange?: Date;
  lastLogin?: Date;
  lastActivity?: Date;
  lastIPAddress?: string;
  lastUserAgent?: string;
  wishlist: string[];
  cart: ICart;
  reviews: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddress {
  _id?: string;
  name: string;
  phone: string;
  street: string;
  area?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  landmark?: string;
  isDefault: boolean;
  type: "home" | "work" | "other";
  deliveryInstructions?: string;
}

export interface IPointsHistory {
  points: number;
  type: "earned" | "redeemed" | "bonus" | "expired";
  orderId?: string;
  description: string;
  date: Date;
}

export interface IPreferences {
  favoriteCategories: string[];
  favoriteBrands: string[];
  preferredNotes: string[];
  scentProfile?: string;
  receiveNewsletter: boolean;
  receivePromotions: boolean;
  receiveOrderUpdates: boolean;
  language: string;
  currency: string;
}

export interface IRefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// ==========================================
// CART INTERFACES
// ==========================================

export interface ICart {
  items: ICartItem[];
  totalItems: number;
  totalPrice: number;
  lastUpdated?: Date;
}

export interface ICartItem {
  product: string;
  quantity: number;
  size: string;
  addedAt: Date;
}

// ==========================================
// PRODUCT INTERFACES
// ==========================================

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  category: ProductCategory;
  subcategory?:
    | "eau-de-parfum"
    | "eau-de-toilette"
    | "parfum"
    | "body-spray"
    | "cologne";
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  discount: number;
  isOnSale: boolean;
  sizes: IProductSize[];
  totalStock: number;
  lowStockThreshold: number;
  stockStatus: "in-stock" | "low-stock" | "out-of-stock" | "discontinued";
  notes: IProductNotes;
  longevity?: number;
  intensity?: "soft" | "moderate" | "intense" | "extreme";
  sillage?: "subtle" | "moderate" | "strong" | "heavy";
  season: ("spring" | "summer" | "fall" | "winter" | "all-season")[];
  occasion: ("everyday" | "office" | "party" | "date" | "wedding" | "formal")[];
  images: IProductImage[];
  video?: {
    url: string;
    thumbnail?: string;
    publicId?: string;
  };
  thumbnail?: {
    url: string;
    publicId: string;
  };
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  tags: string[];
  ratings: IProductRatings;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  isLimited: boolean;
  isPremium: boolean;
  relatedProducts: string[];
  frequentlyBoughtWith: string[];
  views: number;
  purchasedCount: number;
  wishlistCount: number;
  shareCount: number;
  releaseDate?: Date;
  expiryDate?: Date;
  supplier?: {
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
  };
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductSize {
  size: "15ml" | "30ml" | "50ml" | "100ml" | "150ml" | "200ml";
  stock: number;
  price?: number;
  sku?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface IProductNotes {
  top: string[];
  middle: string[];
  base: string[];
  description?: string;
}

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
  isMain: boolean;
  order: number;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
}

export interface IProductRatings {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ==========================================
// ORDER INTERFACES
// ==========================================

export interface IOrder {
  _id: string;
  orderNumber: string;
  user: string;
  customer: IOrderCustomer;
  shippingAddress: IAddress;
  billingAddress: {
    sameAsShipping: boolean;
    name?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  coupon?: {
    code: string;
    discount: number;
    type: "percentage" | "fixed";
    couponId: string;
  };
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails?: {
    transactionId?: string;
    paidAt?: Date;
    refundedAt?: Date;
    gateway?: string;
    gatewayResponse?: any;
    bankTransferReference?: string;
    paymentScreenshot?: {
      url: string;
      publicId: string;
    };
  };
  status: OrderStatus;
  statusHistory: IOrderStatusHistory[];
  shippingMethod: "standard" | "express" | "same-day";
  tracking?: ITracking;
  expectedDelivery?: Date;
  deliveredAt?: Date;
  notifications: {
    orderConfirmation: { sent: boolean; sentAt?: Date };
    paymentConfirmation: { sent: boolean; sentAt?: Date };
    shippingConfirmation: { sent: boolean; sentAt?: Date };
    deliveryConfirmation: { sent: boolean; sentAt?: Date };
  };
  notes?: string;
  giftMessage?: string;
  isGift: boolean;
  giftWrap: boolean;
  invoiceUrl?: string;
  adminNotes?: string;
  source:
    | "website"
    | "whatsapp"
    | "admin"
    | "mobile-app"
    | "instagram"
    | "facebook";
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  couponCode?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancellationNote?: string;
  returnedAt?: Date;
  returnReason?: string;
  returnStatus?: "pending" | "approved" | "rejected" | "completed";
  refundAmount?: number;
  refundStatus?: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderCustomer {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface IOrderItem {
  product: string;
  name: string;
  brand: string;
  size: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
  image?: string;
  notes?: string;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
}

export interface ITracking {
  number?: string;
  provider?: string;
  url?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  status?: "pending" | "processing" | "in-transit" | "delivered" | "failed";
  history?: ITrackingHistory[];
}

export interface ITrackingHistory {
  status: string;
  location?: string;
  timestamp: Date;
  description: string;
}

// ==========================================
// REVIEW INTERFACES
// ==========================================

export interface IReview {
  _id: string;
  user: string;
  product: string;
  order?: string;
  rating: number;
  title?: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  images?: {
    url: string;
    publicId: string;
    alt?: string;
  }[];
  verified: boolean;
  approved: boolean;
  status: "pending" | "approved" | "rejected" | "flagged";
  helpful: {
    count: number;
    users: string[];
  };
  notHelpful: {
    count: number;
    users: string[];
  };
  reported: boolean;
  reports?: {
    user: string;
    reason: "spam" | "inappropriate" | "offensive" | "irrelevant" | "other";
    description?: string;
    timestamp: Date;
  }[];
  adminResponse?: {
    text: string;
    createdAt: Date;
    updatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// COUPON INTERFACES
// ==========================================

export interface ICoupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  applicableBrands?: string[];
  excludedProducts?: string[];
  excludedCategories?: string[];
  userRestrictions?: {
    isFirstOrder?: boolean;
    minOrderCount?: number;
    userTiers?: LoyaltyTier[];
    specificUsers?: string[];
  };
  usedBy: {
    user: string;
    order: string;
    discountAmount: number;
    orderAmount: number;
    usedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// INVENTORY INTERFACES
// ==========================================

export interface IInventory {
  _id: string;
  product: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: "in-stock" | "low-stock" | "out-of-stock" | "discontinued";
  locations: IInventoryLocation[];
  suppliers: ISupplier[];
  lastRestockDate?: Date;
  nextRestockDate?: Date;
  restockFrequency?: number;
  reorderPoint: number;
  costPerUnit?: number;
  totalCost?: number;
  averageCost?: number;
  history: IInventoryHistory[];
  alerts: IInventoryAlert[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryLocation {
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  quantity: number;
  reserved: number;
  isPrimary: boolean;
  notes?: string;
}

export interface ISupplier {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  leadTime: number;
  costPrice?: number;
  minimumOrder: number;
  isPreferred: boolean;
  notes?: string;
}

export interface IInventoryHistory {
  type:
    | "restock"
    | "sale"
    | "adjustment"
    | "return"
    | "reservation"
    | "cancellation"
    | "damage"
    | "theft";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  notes?: string;
  reference?: {
    id: string;
    type: "order" | "product" | "supplier" | "user";
  };
  performedBy?: string;
  date: Date;
  location?: string;
  metadata?: any;
}

export interface IInventoryAlert {
  type: "low-stock" | "out-of-stock" | "restock-needed";
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// ==========================================
// BANNER INTERFACES
// ==========================================

export interface IBanner {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: {
    url: string;
    publicId: string;
    alt: string;
    width?: number;
    height?: number;
    size?: number;
  };
  mobileImage?: {
    url: string;
    publicId: string;
    alt?: string;
  };
  video?: {
    url: string;
    thumbnail?: string;
  };
  link?: {
    url?: string;
    openInNewTab?: boolean;
    text?: string;
  };
  position: "hero" | "category" | "promo" | "sidebar" | "footer" | "popup";
  order: number;
  section: "homepage" | "shop" | "category" | "product" | "checkout";
  visibility: {
    devices: ("desktop" | "tablet" | "mobile")[];
    userSegments: ("new-users" | "returning-users" | "premium-users" | "all")[];
    pages?: string[];
    geolocation?: {
      countries?: string[];
      cities?: string[];
      regions?: string[];
    };
  };
  startDate: Date;
  endDate?: Date;
  scheduleType: "always" | "scheduled" | "recurring";
  recurring?: "daily" | "weekly" | "monthly" | "yearly";
  recurringDays?: number[];
  status: "active" | "inactive" | "scheduled" | "expired";
  style: IBannerStyle;
  targeting: {
    categories?: string[];
    brands?: string[];
    products?: string[];
    minPrice?: number;
    maxPrice?: number;
  };
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
    clickThroughRate: number;
    dailyStats: {
      date: Date;
      impressions: number;
      clicks: number;
      conversions: number;
    }[];
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBannerStyle {
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  alignment: "left" | "center" | "right";
  overlay?: {
    enabled: boolean;
    color?: string;
    opacity: number;
  };
  customCSS?: string;
}

// ==========================================
// NOTIFICATION INTERFACES
// ==========================================

export interface INotification {
  _id: string;
  user: string;
  type: NotificationType;
  subtype?: string;
  title: string;
  message: string;
  summary?: string;
  data?: {
    orderId?: string;
    orderNumber?: string;
    productId?: string;
    productName?: string;
    couponCode?: string;
    discountAmount?: number;
    points?: number;
    tier?: string;
    amount?: number;
    status?: string;
    url?: string;
    image?: string;
    metadata?: any;
  };
  action?: {
    label: string;
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    params?: any;
  };
  read: boolean;
  readAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  clicked: boolean;
  clickedAt?: Date;
  channels: {
    email: { sent: boolean; sentAt?: Date; error?: string };
    sms: { sent: boolean; sentAt?: Date; error?: string };
    push: { sent: boolean; sentAt?: Date; error?: string };
    whatsapp: { sent: boolean; sentAt?: Date; error?: string };
    inApp: { sent: boolean; sentAt?: Date };
  };
  priority: NotificationPriority;
  expiresAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// ANALYTICS INTERFACES
// ==========================================

export interface IAnalytics {
  _id: string;
  type: AnalyticsEventType;
  user?: string;
  sessionId?: string;
  reference?: {
    model: "Product" | "Order" | "Banner" | "Coupon" | "User" | "Category";
    id: string;
  };
  data: {
    // Pageview
    page?: string;
    url?: string;
    referrer?: string;
    // Product
    productId?: string;
    productName?: string;
    productBrand?: string;
    productCategory?: string;
    // Search
    searchTerm?: string;
    searchResults?: number;
    // Cart
    quantity?: number;
    price?: number;
    // Order
    orderId?: string;
    orderNumber?: string;
    orderTotal?: number;
    paymentMethod?: string;
    // User
    userType?: string;
    registrationMethod?: string;
    // Banner
    bannerId?: string;
    bannerTitle?: string;
    // Coupon
    couponCode?: string;
    couponDiscount?: number;
    // Review
    reviewId?: string;
    reviewRating?: number;
    // Share
    sharePlatform?: string;
    // Generic
    value?: number;
    count?: number;
    duration?: number;
    metadata?: any;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
    ipAddress?: string;
    timezone?: string;
  };
  device?: {
    type?: "desktop" | "tablet" | "mobile";
    os?: string;
    browser?: string;
    browserVersion?: string;
    screenSize?: string;
    userAgent?: string;
  };
  source:
    | "direct"
    | "organic"
    | "social"
    | "email"
    | "referral"
    | "whatsapp"
    | "admin";
  medium: "web" | "mobile" | "email" | "social" | "search" | "whatsapp";
  campaign?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  monetaryValue?: number;
  isConversion: boolean;
  conversionValue?: number;
  conversionType?: string;
  eventDate: Date;
  createdAt: Date;
}

// ==========================================
// SCENT PROFILE INTERFACES
// ==========================================

export interface IScentProfile {
  _id: string;
  user: string;
  quizResponses: {
    question: string;
    questionId?: string;
    answer: any;
    options?: string[];
    answeredAt: Date;
  }[];
  preferredNotes: {
    top: { name: string; weight: number }[];
    middle: { name: string; weight: number }[];
    base: { name: string; weight: number }[];
  };
  scentCategories: {
    floral: number;
    woody: number;
    oriental: number;
    citrus: number;
    fresh: number;
    spicy: number;
    aquatic: number;
    gourmand: number;
  };
  preferences: {
    intensity?: "soft" | "moderate" | "intense" | "extreme";
    longevity?: "short" | "medium" | "long" | "extreme";
    seasons: ("spring" | "summer" | "fall" | "winter")[];
    occasions: (
      | "everyday"
      | "office"
      | "party"
      | "date"
      | "wedding"
      | "formal"
    )[];
    budgetRange?: { min: number; max: number };
    preferredBrands?: string[];
    preferredCategories?: string[];
  };
  recommendations: {
    topPicks: {
      product: string;
      score: number;
      reason: string;
      matchedTags: string[];
      recommendedAt: Date;
    }[];
    similarToFavorites: {
      product: string;
      similarity: number;
      recommendedAt: Date;
    }[];
    seasonalPicks: {
      product: string;
      season: string;
      recommendedAt: Date;
    }[];
  };
  favoriteProducts: {
    product: string;
    rating: number;
    addedAt: Date;
  }[];
  quizCompleted: boolean;
  quizCompletedAt?: Date;
  quizScore?: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// TYPE ALIASES
// ==========================================

export type UserRole = "customer" | "admin" | "manager" | "delivery";
export type UserStatus = "active" | "suspended" | "deactivated";
export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";
export type ProductCategory = "men" | "women" | "unisex" | "niche";
export type ProductStatus =
  | "active"
  | "inactive"
  | "draft"
  | "out-of-stock"
  | "discontinued";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";
export type PaymentMethod =
  | "cod"
  | "bank-transfer"
  | "jazzcash"
  | "easypaisa"
  | "online";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially-refunded";
export type NotificationType =
  | "order"
  | "payment"
  | "shipping"
  | "delivery"
  | "review"
  | "promotion"
  | "newsletter"
  | "system"
  | "security"
  | "loyalty"
  | "wishlist"
  | "stock"
  | "admin";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type AnalyticsEventType =
  | "pageview"
  | "product-view"
  | "search"
  | "add-to-cart"
  | "remove-from-cart"
  | "checkout"
  | "order"
  | "payment"
  | "user-registration"
  | "user-login"
  | "user-logout"
  | "banner-click"
  | "coupon-use"
  | "review"
  | "share"
  | "wishlist-add"
  | "wishlist-remove"
  | "click"
  | "conversion";
