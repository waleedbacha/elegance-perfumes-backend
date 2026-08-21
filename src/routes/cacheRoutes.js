// backend/src/routes/cacheRoutes.js
const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getCacheStats,
  clearAllCaches,
  clearMemoryCache,
  clearRedisCache,
  clearImageCache,
  clearCacheByPrefix,
  runCleanup,
  clearBrowserCache,
} = require("../controllers/cacheController");

// ============================================
// CACHE MANAGEMENT ROUTES
// ============================================

/**
 * @route   GET /api/v1/cache/stats
 * @desc    Get cache statistics
 * @access  Private/Admin
 */
router.get("/stats", protect, adminOnly, getCacheStats);

/**
 * @route   DELETE /api/v1/cache/all
 * @desc    Clear all caches
 * @access  Private/Admin
 */
router.delete("/all", protect, adminOnly, clearAllCaches);

/**
 * @route   DELETE /api/v1/cache/memory
 * @desc    Clear memory cache only
 * @access  Private/Admin
 */
router.delete("/memory", protect, adminOnly, clearMemoryCache);

/**
 * @route   DELETE /api/v1/cache/redis
 * @desc    Clear Redis cache only
 * @access  Private/Admin
 */
router.delete("/redis", protect, adminOnly, clearRedisCache);

/**
 * @route   DELETE /api/v1/cache/images
 * @desc    Clear image cache
 * @access  Private/Admin
 */
router.delete("/images", protect, adminOnly, clearImageCache);

/**
 * @route   DELETE /api/v1/cache/prefix/:prefix
 * @desc    Clear cache by prefix
 * @access  Private/Admin
 */
router.delete("/prefix/:prefix", protect, adminOnly, clearCacheByPrefix);

/**
 * @route   POST /api/v1/cache/cleanup
 * @desc    Run scheduled cleanup
 * @access  Private/Admin
 */
router.post("/cleanup", protect, adminOnly, runCleanup);

/**
 * @route   POST /api/v1/cache/browser
 * @desc    Clear browser cache headers
 * @access  Private/Admin
 */
router.post("/browser", protect, adminOnly, clearBrowserCache);

module.exports = router;
