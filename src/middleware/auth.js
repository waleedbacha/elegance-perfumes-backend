/**
 * Authentication Middleware
 * JWT verification and user authentication
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("./errorHandler");
const { MESSAGES, USER_STATUS } = require("../config/constants");

/**
 * Protect routes - Require authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Check for token in cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new AppError(MESSAGES.UNAUTHORIZED, 401, "NO_TOKEN");
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new AppError(
          "Token expired. Please log in again.",
          401,
          "TOKEN_EXPIRED",
        );
      }
      throw new AppError(MESSAGES.INVALID_TOKEN, 401, "INVALID_TOKEN");
    }

    // Get user from database
    const user = await User.findById(decoded.id).select(
      "-password -refreshTokens -resetPasswordToken -verificationToken",
    );

    if (!user) {
      throw new AppError("User no longer exists", 401, "USER_NOT_FOUND");
    }

    // Check if user is active
    if (user.status === USER_STATUS.SUSPENDED) {
      throw new AppError(
        "Account has been suspended",
        403,
        "ACCOUNT_SUSPENDED",
      );
    }

    if (user.status === USER_STATUS.DEACTIVATED) {
      throw new AppError(
        "Account has been deactivated",
        403,
        "ACCOUNT_DEACTIVATED",
      );
    }

    // Check if user is verified (optional - can be skipped for some routes)
    // if (!user.isVerified) {
    //   throw new AppError('Please verify your email first', 403, 'EMAIL_NOT_VERIFIED');
    // }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    // Update last activity
    user.lastActivity = new Date();
    await user.save({ validateBeforeSave: false });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Admin only middleware
 */
exports.adminOnly = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(MESSAGES.UNAUTHORIZED, 401, "NO_USER");
    }

    if (req.user.role !== "admin") {
      throw new AppError(MESSAGES.FORBIDDEN, 403, "ADMIN_ONLY");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Manager or admin middleware
 */
exports.managerOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(MESSAGES.UNAUTHORIZED, 401, "NO_USER");
    }

    if (!["admin", "manager"].includes(req.user.role)) {
      throw new AppError(
        "Manager or admin access required",
        403,
        "MANAGER_ONLY",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't require login but attaches user if token present
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select(
          "-password -refreshTokens -resetPasswordToken -verificationToken",
        );

        if (user && user.status === USER_STATUS.ACTIVE) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (error) {
        // Invalid token - continue without user
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict to specific roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.UNAUTHORIZED, 401, "NO_USER");
      }

      if (!roles.includes(req.user.role)) {
        throw new AppError(
          `Access restricted to: ${roles.join(", ")}`,
          403,
          "ROLE_RESTRICTED",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user owns the resource or is admin
 */
exports.ownsResource = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.UNAUTHORIZED, 401, "NO_USER");
      }

      // Admin can access everything
      if (req.user.role === "admin") {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);

      if (req.user._id.toString() !== resourceUserId.toString()) {
        throw new AppError(
          "You do not have permission to access this resource",
          403,
          "NOT_OWNER",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Session middleware - for guest carts
 */
exports.sessionMiddleware = (req, res, next) => {
  try {
    // Generate session ID if not exists
    if (!req.cookies?.sessionId && !req.headers["x-session-id"]) {
      const sessionId = require("uuid").v4();
      req.sessionId = sessionId;

      // Set cookie
      res.cookie("sessionId", sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    } else {
      req.sessionId = req.cookies?.sessionId || req.headers["x-session-id"];
    }

    next();
  } catch (error) {
    next(error);
  }
};
