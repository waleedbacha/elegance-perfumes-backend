/**
 * JWT Utility
 * Token generation and verification
 */

const jwt = require("jsonwebtoken");

class JWTUtils {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expire = process.env.JWT_EXPIRE || "7d";
    this.refreshExpire = process.env.JWT_REFRESH_EXPIRE || "30d";
  }

  /**
   * Generate access token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expire,
      issuer: "elegance-api",
      audience: "elegance-client",
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.refreshExpire,
      issuer: "elegance-api",
      audience: "elegance-client",
    });
  }

  /**
   * Verify token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: "elegance-api",
        audience: "elegance-client",
      });
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Generate reset password token
   */
  generateResetToken(userId) {
    return jwt.sign({ id: userId, purpose: "reset-password" }, this.secret, {
      expiresIn: "1h",
    });
  }

  /**
   * Verify reset token
   */
  verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (decoded.purpose !== "reset-password") {
        throw new Error("Invalid token purpose");
      }
      return decoded;
    } catch (error) {
      throw new Error(`Reset token verification failed: ${error.message}`);
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailToken(userId) {
    return jwt.sign(
      { id: userId, purpose: "email-verification" },
      this.secret,
      { expiresIn: "24h" },
    );
  }

  /**
   * Verify email token
   */
  verifyEmailToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (decoded.purpose !== "email-verification") {
        throw new Error("Invalid token purpose");
      }
      return decoded;
    } catch (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiry(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded.exp ? new Date(decoded.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }
}

module.exports = new JWTUtils();
