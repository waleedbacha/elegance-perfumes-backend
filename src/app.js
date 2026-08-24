/**
 * Express App Configuration
 * Main application setup
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

require("express-async-errors");

const errorHandler = require("./middleware/errorHandler");
const { MESSAGES } = require("./config/constants");

// Import routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const couponRoutes = require("./routes/couponRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const heroRoutes = require("./routes/heroRoutes");
const settingRoutes = require("./routes/settingRoutes");
const navbarRoutes = require("./routes/navbarRoutes");
const seoRoutes = require("./routes/seoRoutes");
const cacheRoutes = require("./routes/cacheRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

// Initialize express app
const app = express();

// ==========================================
// ENSURE REQUIRED DIRECTORIES EXIST
// ==========================================

const directories = [
  path.join(__dirname, "../uploads"),
  path.join(__dirname, "../public"),
  path.join(__dirname, "../invoices"),
];

directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet - Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        fontSrc: ["'self'"],
      },
    },
  }),
);

const allowedOrigins = [
  "https://elegance-perfumes.vercel.app",
  "http://localhost:3000",
  "https://elegance-perfumes.vercel.app/",
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log("✅ Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ==========================================
// RATE LIMITING
// ==========================================

// General rate limiter for all API routes
const limiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

// ==========================================
// REQUEST PARSING
// ==========================================

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// ==========================================
// SECURITY FILTERS
// ==========================================

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
});

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      "price",
      "rating",
      "category",
      "brand",
      "status",
      "page",
      "limit",
      "sort",
      "minPrice",
      "maxPrice",
      "discount",
    ],
  }),
);

// ==========================================
// COMPRESSION
// ==========================================

app.use(compression());

// ==========================================
// LOGGING
// ==========================================

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ==========================================
// STATIC FILES
// ==========================================

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/public", express.static(path.join(__dirname, "../public")));

// ✅ ADD THIS - Serve invoice files
app.use("/invoices", express.static(path.join(__dirname, "../invoices")));

// ✅ Optional: Add a route to list invoices (for debugging)
if (process.env.NODE_ENV === "development") {
  app.get("/invoices", (req, res) => {
    const invoicesDir = path.join(__dirname, "../invoices");
    if (fs.existsSync(invoicesDir)) {
      const files = fs.readdirSync(invoicesDir);
      res.json({
        success: true,
        data: {
          files,
          count: files.length,
          directory: invoicesDir,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          files: [],
          count: 0,
          message: "Invoices directory not found",
        },
      });
    }
  });
}

// ==========================================
// ROUTES
// ==========================================

const API_PREFIX = `/api/${process.env.API_VERSION || "v1"}`;

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "Elegance Perfumes API",
    version: process.env.API_VERSION || "v1",
    status: "running",
    documentation: "/api-docs",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/reviews`, reviewRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);
app.use(`${API_PREFIX}/coupons`, couponRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/banners`, bannerRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/payment`, paymentRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/hero`, heroRoutes);
app.use(`${API_PREFIX}/settings`, settingRoutes);
app.use(`${API_PREFIX}/navbar`, navbarRoutes);
app.use("/api/v1/seo", seoRoutes);
app.use("/api/v1/cache", cacheRoutes);
app.use("/api/v1/whatsapp", whatsappRoutes);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: MESSAGES.NOT_FOUND,
      path: req.originalUrl,
    },
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(errorHandler);

// ==========================================
// EXPORT
// ==========================================

module.exports = app;
