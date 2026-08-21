/**
 * Admin Authentication Middleware
 * Advanced admin authorization
 */

const { AppError } = require("./errorHandler");
const User = require("../models/User");
const { USER_ROLES } = require("../config/constants");

/**
 * Check if user has admin role
 */
exports.isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "NO_USER");
    }

    if (req.user.role !== USER_ROLES.ADMIN) {
      throw new AppError("Admin access required", 403, "ADMIN_ONLY");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has super admin role
 */
exports.isSuperAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "NO_USER");
    }

    // Check for super admin flag in database or special role
    if (req.user.role !== USER_ROLES.ADMIN || !req.user.isSuperAdmin) {
      throw new AppError(
        "Super admin access required",
        403,
        "SUPER_ADMIN_ONLY",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check admin permissions for specific actions
 */
exports.hasPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "NO_USER");
      }

      if (req.user.role !== USER_ROLES.ADMIN) {
        throw new AppError("Admin access required", 403, "ADMIN_ONLY");
      }

      // Check if admin has specific permission
      const permissions = req.user.permissions || [];
      if (!permissions.includes(permission) && !permissions.includes("all")) {
        throw new AppError(
          `You don't have permission to: ${permission}`,
          403,
          "PERMISSION_DENIED",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Admin activity logger
 */
exports.logAdminActivity = (action) => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.role === USER_ROLES.ADMIN) {
        // Log admin activity
        // This could be stored in a separate collection or file
        const activity = {
          adminId: req.user._id,
          adminEmail: req.user.email,
          action,
          resource: req.originalUrl,
          method: req.method,
          ip: req.ip,
          timestamp: new Date(),
          data: {
            params: req.params,
            query: req.query,
            body: req.body,
          },
        };

        // Store in database or log file
        console.log("Admin Activity:", JSON.stringify(activity));
      }

      next();
    } catch (error) {
      // Don't fail the request if logging fails
      next();
    }
  };
};

/**
 * Admin rate limiter (stricter than regular)
 */
exports.adminRateLimiter = (req, res, next) => {
  // This is a placeholder - actual rate limiting is implemented in rateLimiter.js
  next();
};
