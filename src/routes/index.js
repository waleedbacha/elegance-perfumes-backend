/**
 * Routes Index
 * Central route configuration
 */

const express = require("express");
const router = express.Router();

// Import all route modules
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const productRoutes = require("./productRoutes");
const orderRoutes = require("./orderRoutes");
const reviewRoutes = require("./reviewRoutes");
const cartRoutes = require("./cartRoutes");
const wishlistRoutes = require("./wishlistRoutes");
const couponRoutes = require("./couponRoutes");
const inventoryRoutes = require("./inventoryRoutes");
const bannerRoutes = require("./bannerRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const notificationRoutes = require("./notificationRoutes");
const paymentRoutes = require("./paymentRoutes");

// Health check route
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API version info
router.get("/version", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      version: process.env.API_VERSION || "v1",
      name: "Elegance Perfumes API",
      status: "operational",
      documentation: "/api-docs",
    },
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/coupons", couponRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/banners", bannerRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payment", paymentRoutes);

module.exports = router;


