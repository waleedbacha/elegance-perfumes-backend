/**
 * Security Middleware
 * Advanced security features
 */

const helmet = require("helmet");
const xss = require("xss");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const { AppError } = require("./errorHandler");

/**
 * Security headers using Helmet
 */
exports.securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        "data:",
        "https://res.cloudinary.com",
        "https://*.cloudinary.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ],
      connectSrc: ["'self'", "https://*.cloudinary.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

/**
 * XSS Protection
 */
exports.xssProtection = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body) {
      Object.keys(req.body).forEach((key) => {
        if (typeof req.body[key] === "string") {
          req.body[key] = xss(req.body[key], {
            whiteList: {}, // No tags allowed
            stripIgnoreTag: true,
            stripIgnoreTagBody: ["script", "style"],
          });
        }
        // Handle nested objects
        if (typeof req.body[key] === "object" && req.body[key] !== null) {
          sanitizeObject(req.body[key]);
        }
      });
    }

    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach((key) => {
        if (typeof req.query[key] === "string") {
          req.query[key] = xss(req.query[key], {
            whiteList: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: ["script", "style"],
          });
        }
      });
    }

    // Sanitize URL parameters
    if (req.params) {
      Object.keys(req.params).forEach((key) => {
        if (typeof req.params[key] === "string") {
          req.params[key] = xss(req.params[key], {
            whiteList: {},
            stripIgnoreTag: true,
            stripIgnoreTagBody: ["script", "style"],
          });
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to sanitize nested objects
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return;

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === "string") {
      obj[key] = xss(obj[key], {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ["script", "style"],
      });
    }
    if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  });
}

/**
 * NoSQL Injection Protection
 */
exports.noSqlInjection = mongoSanitize({
  replaceWith: "_", // Replace dangerous characters with underscore
});

/**
 * Parameter Pollution Protection
 */
exports.paramPollution = hpp({
  whitelist: [
    // Product filters
    "category",
    "brand",
    "price",
    "rating",
    "status",
    "tags",
    "search",
    "sortBy",
    "sortOrder",
    "page",
    "limit",
    "minPrice",
    "maxPrice",
    "discount",
    // Order filters
    "orderStatus",
    "paymentStatus",
    "startDate",
    "endDate",
  ],
});

/**
 * API Key Validation
 */
exports.validateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    const validApiKeys = process.env.API_KEYS?.split(",") || [];

    // Skip API key validation for certain routes
    if (req.path.startsWith("/webhook") || req.path.startsWith("/health")) {
      return next();
    }

    if (!apiKey) {
      throw new AppError("API key is required", 401, "API_KEY_REQUIRED");
    }

    if (!validApiKeys.includes(apiKey)) {
      throw new AppError("Invalid API key", 401, "INVALID_API_KEY");
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * CORS configuration
 */
exports.corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV === "development"
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-API-Key",
    "X-Session-ID",
    "X-Device-ID",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  maxAge: 86400, // 24 hours
};

/**
 * Request size limiter
 */
exports.requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers["content-length"]) || 0;
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    throw new AppError("Request body too large", 413, "PAYLOAD_TOO_LARGE");
  }

  next();
};

/**
 * Trust proxy - for behind load balancers
 */
exports.trustProxy = (req, res, next) => {
  req.trustProxy = true;
  next();
};

/**
 * Block common attack patterns
 */
exports.blockAttackPatterns = (req, res, next) => {
  try {
    const url = req.url.toLowerCase();
    const patterns = [
      /\/\.env/i,
      /\/\.git/i,
      /\/\.ssh/i,
      /\/wp-admin/i,
      /\/wp-login/i,
      /\/phpmyadmin/i,
      /\/_vti_bin/i,
      /\/cgi-bin/i,
      /\/mysql/i,
      /\/adminer/i,
      /\/\.aws/i,
      /\/\.config/i,
      /\/\.github/i,
      /\/\.travis/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(url)) {
        throw new AppError("Access denied", 403, "ACCESS_DENIED");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Prevent IP spoofing
 */
exports.preventIpSpoofing = (req, res, next) => {
  // Trust only specific proxy headers
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // Use the first IP in the chain
    const ips = forwardedFor.split(",");
    req.ip = ips[0].trim();
  }
  next();
};

/**
 * Request ID middleware
 */
exports.requestId = (req, res, next) => {
  const reqId = require("uuid").v4();
  req.reqId = reqId;
  res.setHeader("X-Request-ID", reqId);
  next();
};
