/**
 * Logger Middleware
 * Request logging and monitoring
 */

const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
  }),
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    // File transport - all logs
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // File transport - error logs
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Don't log to files in test environment
if (process.env.NODE_ENV === "test") {
  logger.transports.forEach((t) => {
    if (t instanceof winston.transports.File) {
      t.silent = true;
    }
  });
}

/**
 * HTTP request logger middleware
 */
exports.loggerMiddleware = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    userId: req.user?._id || req.userId || "guest",
  });

  // Log response on finish
  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "error" : "info";

    logger[level]("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id || req.userId || "guest",
    });
  });

  next();
};

/**
 * Error logger
 */
exports.logError = (error, req = null) => {
  const logData = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    ...(req && {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?._id || req.userId || "guest",
      body: req.body,
      params: req.params,
      query: req.query,
    }),
  };

  logger.error("Error occurred", logData);
};

/**
 * Log database operations
 */
exports.logDatabase = (operation, collection, query, duration) => {
  if (process.env.NODE_ENV === "development") {
    logger.debug("Database operation", {
      operation,
      collection,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
    });
  }
};

/**
 * Log API calls to external services
 */
exports.logExternalApi = (service, endpoint, method, status, duration) => {
  logger.info("External API call", {
    service,
    endpoint,
    method,
    status,
    duration: `${duration}ms`,
  });
};

/**
 * Log business events
 */
exports.logEvent = (event, data, userId = null) => {
  logger.info("Business event", {
    event,
    userId,
    data,
    timestamp: new Date().toISOString(),
  });
};

// Export logger instance
module.exports = logger;
module.exports.loggerMiddleware = exports.loggerMiddleware;
