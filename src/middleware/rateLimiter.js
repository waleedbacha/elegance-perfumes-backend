/**
 * Rate Limiter Middleware
 * Simple request rate limiting
 */

const rateLimit = require("express-rate-limit");

// General rate limiter
exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later.",
    },
  },
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || "unknown";
  },
  skip: (req) => {
    return false;
  },
});

// ✅ AUTH RATE LIMITER - More permissive
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT",
      message:
        "Too many authentication attempts. Please try again after 15 minutes.",
    },
  },
  keyGenerator: (req) => {
    const userId = req.user?._id || req.userId;
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    return userId ? `${ip}-${userId}` : ip;
  },
  skip: (req) => {
    // ✅ Skip rate limiting for successful logins (handled in controller)
    return false;
  },
  // ✅ Custom handler with consistent response
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.status(429).json({
      success: false,
      error: {
        code: "AUTH_RATE_LIMIT",
        message: `Too many authentication attempts. Please try again after ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter: retryAfter,
      },
      timestamp: new Date().toISOString(),
    });
  },
});

// Password reset rate limiter
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, // ✅ Increased from 5 to 10
  message: {
    success: false,
    error: {
      code: "RESET_LIMIT",
      message:
        "Too many password reset attempts. Please try again after 1 hour.",
    },
  },
  keyGenerator: (req) => {
    return req.ip || req.connection?.remoteAddress || "unknown";
  },
});

// Order rate limiter
exports.orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, // ✅ Increased from 10 to 20
  message: {
    success: false,
    error: {
      code: "ORDER_LIMIT",
      message: "Too many orders placed. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    const userId = req.user?._id || req.userId;
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    return userId ? `${ip}-${userId}` : ip;
  },
});

// Payment rate limiter
exports.paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // ✅ Increased from 5 to 10
  message: {
    success: false,
    error: {
      code: "PAYMENT_LIMIT",
      message: "Too many payment attempts. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    const userId = req.user?._id || req.userId;
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    return userId ? `${ip}-${userId}` : ip;
  },
});

// Review rate limiter
exports.reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: "REVIEW_LIMIT",
      message: "Too many reviews submitted. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    return (
      req.user?._id || req.ip || req.connection?.remoteAddress || "unknown"
    );
  },
});

// Admin rate limiter
exports.adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: "ADMIN_RATE_LIMIT",
      message: "Too many admin requests. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    return (
      req.user?._id || req.ip || req.connection?.remoteAddress || "unknown"
    );
  },
});

// Upload rate limiter
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: "UPLOAD_LIMIT",
      message: "Too many uploads. Please try again later.",
    },
  },
  keyGenerator: (req) => {
    return (
      req.user?._id || req.ip || req.connection?.remoteAddress || "unknown"
    );
  },
});

// Custom rate limiter
exports.customLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: message || {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later.",
      },
    },
    keyGenerator: (req) => {
      const userId = req.user?._id || req.userId;
      const ip = req.ip || req.connection?.remoteAddress || "unknown";
      return userId ? `${ip}-${userId}` : ip;
    },
  });
};

// Skip rate limiting
exports.skipRateLimit = (condition) => {
  return (req, res, next) => {
    if (typeof condition === "function" && condition(req)) {
      req.skipRateLimit = true;
    }
    next();
  };
};
