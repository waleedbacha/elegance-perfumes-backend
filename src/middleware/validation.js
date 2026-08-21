/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { validationResult } = require("express-validator");
const { AppError } = require("./errorHandler");
const { MESSAGES } = require("../config/constants");

/**
 * Validate request using express-validator
 */
/**
 * Validate request using express-validator
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  // ✅ Add debug logs to see what's failing
  console.log("❌ Validation errors:", JSON.stringify(errors.array(), null, 2));
  console.log("❌ Request body:", JSON.stringify(req.body, null, 2));

  // Format errors
  const formattedErrors = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  const error = new AppError(
    MESSAGES.VALIDATION_ERROR || "Validation error",
    400,
    "VALIDATION_ERROR",
  );
  error.details = formattedErrors;

  next(error);
};

/**
 * Validate request body schema with custom validation
 */
exports.validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const formattedErrors = error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          value: err.context?.value,
        }));

        const validationError = new AppError(
          MESSAGES.VALIDATION_ERROR,
          400,
          "VALIDATION_ERROR",
        );
        validationError.details = formattedErrors;
        throw validationError;
      }

      // Replace body with validated value
      req.body = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
exports.validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const formattedErrors = error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          value: err.context?.value,
        }));

        const validationError = new AppError(
          "Invalid query parameters",
          400,
          "QUERY_VALIDATION_ERROR",
        );
        validationError.details = formattedErrors;
        throw validationError;
      }

      req.query = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate URL parameters
 */
exports.validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const formattedErrors = error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          value: err.context?.value,
        }));

        const validationError = new AppError(
          "Invalid URL parameters",
          400,
          "PARAM_VALIDATION_ERROR",
        );
        validationError.details = formattedErrors;
        throw validationError;
      }

      req.params = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Common validators
 */
exports.commonValidators = {
  // MongoDB ObjectId
  isValidId: (value) => {
    const mongoose = require("mongoose");
    return mongoose.Types.ObjectId.isValid(value);
  },

  // Phone number
  isValidPhone: (value) => {
    return /^[\+]?[0-9]{10,15}$/.test(value);
  },

  // Email
  isValidEmail: (value) => {
    return /^\S+@\S+\.\S+$/.test(value);
  },

  // URL
  isValidUrl: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // Date
  isValidDate: (value) => {
    return !isNaN(new Date(value).getTime());
  },

  // Numeric
  isNumeric: (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  // Positive integer
  isPositiveInt: (value) => {
    return Number.isInteger(value) && value > 0;
  },

  // Non-negative integer
  isNonNegativeInt: (value) => {
    return Number.isInteger(value) && value >= 0;
  },

  // Percentage
  isPercentage: (value) => {
    return typeof value === "number" && value >= 0 && value <= 100;
  },

  // Array of strings
  isArrayOfStrings: (value) => {
    return Array.isArray(value) && value.every((v) => typeof v === "string");
  },
};
