/**
 * JWT Configuration
 * Token management and validation
 */

const jwt = require("jsonwebtoken");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

class JWTConfig {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expire = process.env.JWT_EXPIRE || "7d";
    this.refreshExpire = process.env.JWT_REFRESH_EXPIRE || "30d";
    this.issuer = "elegance-api";
    this.audience = "elegance-client";
  }

  /**
   * Generate access token
   */
  generateToken(payload) {
    try {
      if (!this.secret) {
        throw new Error("JWT_SECRET is not set");
      }

      return jwt.sign(payload, this.secret, {
        expiresIn: this.expire,
        issuer: this.issuer,
        audience: this.audience,
        algorithm: "HS256",
      });
    } catch (error) {
      logger.error("JWT token generation failed:", error.message);
      throw new AppError(
        "Failed to generate token",
        500,
        "JWT_GENERATION_FAILED",
      );
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    try {
      if (!this.secret) {
        throw new Error("JWT_SECRET is not set");
      }

      return jwt.sign(payload, this.secret, {
        expiresIn: this.refreshExpire,
        issuer: this.issuer,
        audience: this.audience,
        algorithm: "HS256",
      });
    } catch (error) {
      logger.error("JWT refresh token generation failed:", error.message);
      throw new AppError(
        "Failed to generate refresh token",
        500,
        "JWT_GENERATION_FAILED",
      );
    }
  }

  /**
   * Verify token
   */
  verifyToken(token, options = {}) {
    try {
      if (!this.secret) {
        throw new Error("JWT_SECRET is not set");
      }

      return jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        ...options,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AppError("Token has expired", 401, "TOKEN_EXPIRED");
      }
      if (error.name === "JsonWebTokenError") {
        throw new AppError("Invalid token", 401, "INVALID_TOKEN");
      }
      throw new AppError(
        "Token verification failed",
        401,
        "TOKEN_VERIFICATION_FAILED",
      );
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error("JWT decode failed:", error.message);
      return null;
    }
  }

  /**
   * Generate verification token
   */
  generateVerificationToken(userId) {
    return this.generateToken({
      id: userId,
      purpose: "email-verification",
    });
  }

  /**
   * Verify verification token
   */
  verifyVerificationToken(token) {
    const decoded = this.verifyToken(token);

    if (decoded.purpose !== "email-verification") {
      throw new AppError(
        "Invalid verification token",
        400,
        "INVALID_VERIFICATION_TOKEN",
      );
    }

    return decoded;
  }

  /**
   * Generate password reset token
   */
  generateResetToken(userId) {
    return this.generateToken({
      id: userId,
      purpose: "password-reset",
    });
  }

  /**
   * Verify password reset token
   */
  verifyResetToken(token) {
    const decoded = this.verifyToken(token);

    if (decoded.purpose !== "password-reset") {
      throw new AppError("Invalid reset token", 400, "INVALID_RESET_TOKEN");
    }

    return decoded;
  }

  /**
   * Generate API key token
   */
  generateApiKey(service) {
    return this.generateToken({
      service,
      purpose: "api-key",
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Verify API key
   */
  verifyApiKey(token) {
    const decoded = this.verifyToken(token);

    if (decoded.purpose !== "api-key") {
      throw new AppError("Invalid API key", 401, "INVALID_API_KEY");
    }

    return decoded;
  }

  /**
   * Generate session token
   */
  generateSessionToken(userId, sessionId) {
    return this.generateToken({
      id: userId,
      sessionId,
      purpose: "session",
    });
  }

  /**
   * Verify session token
   */
  verifySessionToken(token) {
    const decoded = this.verifyToken(token);

    if (decoded.purpose !== "session") {
      throw new AppError("Invalid session token", 401, "INVALID_SESSION");
    }

    return decoded;
  }

  /**
   * Refresh token pair
   */
  refreshTokenPair(userId, role) {
    const accessToken = this.generateToken({ id: userId, role });
    const refreshToken = this.generateRefreshToken({ id: userId });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get token expiration
   */
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    return expiration < new Date();
  }

  /**
   * Get token remaining time
   */
  getTokenRemainingTime(token) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return 0;
    const remaining = expiration - new Date();
    return Math.max(0, remaining);
  }

  /**
   * Blacklist token (for logout)
   */
  async blacklistToken(token, ttl = 86400) {
    // This requires Redis or database storage
    // Implementation depends on your cache solution
    // For now, log the action
    logger.info("Token blacklisted:", {
      token: token.substring(0, 10) + "...",
    });
    return true;
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    // This requires Redis or database storage
    // For now, return false
    return false;
  }

  /**
   * Get JWT configuration
   */
  getConfig() {
    return {
      secret: this.secret ? "***" : "not set",
      expire: this.expire,
      refreshExpire: this.refreshExpire,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: "HS256",
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      healthy: !!this.secret,
      secretSet: !!this.secret,
      expire: this.expire,
      refreshExpire: this.refreshExpire,
    };
  }
}

// Export singleton instance
module.exports = new JWTConfig();
