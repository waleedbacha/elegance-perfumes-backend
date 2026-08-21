/**
 * Express Type Definitions
 * Extends Express types with custom properties
 */

// ==========================================
// USER INTERFACES
// ==========================================

interface IUser {
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

interface IAddress {
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

interface IPointsHistory {
  points: number;
  type: "earned" | "redeemed" | "bonus" | "expired";
  orderId?: string;
  description: string;
  date: Date;
}

interface IPreferences {
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

interface IRefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// ==========================================
// CART INTERFACES
// ==========================================

interface ICart {
  items: ICartItem[];
  totalItems: number;
  totalPrice: number;
  lastUpdated?: Date;
}

interface ICartItem {
  product: string;
  quantity: number;
  size: string;
  addedAt: Date;
}

// ==========================================
// TYPE ALIASES
// ==========================================

type UserRole = "customer" | "admin" | "manager" | "delivery";
type UserStatus = "active" | "suspended" | "deactivated";
type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

// ==========================================
// EXPRESS EXTENSIONS
// ==========================================

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      sessionId?: string;
      reqId?: string;
      skipRateLimit?: boolean;
      files?: any;
      file?: any;
    }

    interface Response {
      success(data?: any, message?: string, statusCode?: number): Response;
      error(message?: string, statusCode?: number, code?: string): Response;
    }
  }
}

// Export types for use in other files
export {};
