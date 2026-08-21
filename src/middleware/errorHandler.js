/**
 * Error Handler Middleware
 * Centralized error handling
 */

const { MESSAGES } = require("../config/constants");

/**
 * Custom AppError class
 */
class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message || MESSAGES.SERVER_ERROR;

  // Log error
  console.error("❌ Error:", {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id || req.userId,
    timestamp: new Date().toISOString(),
  });

  // ==========================================
  // HANDLE SPECIFIC ERROR TYPES
  // ==========================================

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    error = new AppError(
      MESSAGES.VALIDATION_ERROR,
      400,
      "VALIDATION_ERROR",
      errors,
    );
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists. Please use a different ${field}.`;
    error = new AppError(message, 409, "DUPLICATE_ENTRY", [{ field, message }]);
  }

  // Mongoose Cast Error
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400, "INVALID_ID", [
      { field: err.path, message },
    ]);
  }

  // Mongoose Document Not Found
  if (err.name === "DocumentNotFoundError") {
    error = new AppError(MESSAGES.NOT_FOUND, 404, "NOT_FOUND");
  }

  // JWT Error
  if (err.name === "JsonWebTokenError") {
    error = new AppError(MESSAGES.INVALID_TOKEN, 401, "INVALID_TOKEN");
  }

  // JWT Expired Error
  if (err.name === "TokenExpiredError") {
    error = new AppError(
      "Token expired. Please log in again.",
      401,
      "TOKEN_EXPIRED",
    );
  }

  // JWT Not Before Error
  if (err.name === "NotBeforeError") {
    error = new AppError("Token not active yet", 401, "TOKEN_NOT_ACTIVE");
  }

  // Multer Errors
  if (err.code === "LIMIT_FILE_SIZE") {
    error = new AppError(
      "File too large. Maximum size is 5MB.",
      400,
      "FILE_TOO_LARGE",
    );
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    error = new AppError("Too many files.", 400, "TOO_MANY_FILES");
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error = new AppError("Unexpected file field.", 400, "UNEXPECTED_FILE");
  }

  // Rate Limit Error
  if (err.code === "RATE_LIMIT_EXCEEDED" || err.name === "RateLimitError") {
    error = new AppError(
      "Too many requests, please try again later.",
      429,
      "RATE_LIMIT_EXCEEDED",
    );
  }

  // ==========================================
  // SEND RESPONSE
  // ==========================================

  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_ERROR";
  const message = error.message || MESSAGES.SERVER_ERROR;

  const response = {
    success: false,
    error: {
      code,
      message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    timestamp: error.timestamp || new Date().toISOString(),
    path: req.originalUrl,
  };

  // Add validation details if available
  if (err.errors) {
    response.error.details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
exports.notFound = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    "ROUTE_NOT_FOUND",
  );
  next(error);
};

/**
 * Async wrapper to catch errors in async route handlers
 */
exports.catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Unhandled rejection handler
 */
exports.handleUnhandledRejection = (err) => {
  console.error("💥 Unhandled Rejection:", err);
  // Graceful shutdown
  process.exit(1);
};

/**
 * Uncaught exception handler
 */
exports.handleUncaughtException = (err) => {
  console.error("💥 Uncaught Exception:", err);
  // Graceful shutdown
  process.exit(1);
};

// Export AppError for use in other files
module.exports = errorHandler;
module.exports.AppError = AppError;
