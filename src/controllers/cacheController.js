// backend/src/controllers/cacheController.js
const cacheService = require("../services/cacheService");
const { AppError } = require("../middleware/errorHandler");

// ============================================
// GET CACHE STATISTICS
// ============================================
exports.getCacheStats = async (req, res, next) => {
  try {
    const stats = cacheService.getStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CLEAR ALL CACHES
// ============================================
exports.clearAllCaches = async (req, res, next) => {
  try {
    const result = await cacheService.clearAllCaches();
    res.status(200).json({
      success: true,
      data: result,
      message: "All caches cleared successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CLEAR MEMORY CACHE
// ============================================
exports.clearMemoryCache = async (req, res, next) => {
  try {
    const result = cacheService.clearMemoryCache();
    res.status(200).json({
      success: true,
      data: result,
      message: "Memory cache cleared",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CLEAR REDIS CACHE
// ============================================
exports.clearRedisCache = async (req, res, next) => {
  try {
    const result = await cacheService.clearRedisCache();
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CLEAR IMAGE CACHE
// ============================================
exports.clearImageCache = async (req, res, next) => {
  try {
    const result = await cacheService.clearImageCache();
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CLEAR BY PREFIX
// ============================================
exports.clearCacheByPrefix = async (req, res, next) => {
  try {
    const { prefix } = req.params;
    if (!prefix) {
      throw new AppError("Prefix is required", 400, "MISSING_PREFIX");
    }

    const result = cacheService.clearCacheByPrefix(prefix);
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// RUN SCHEDULED CLEANUP
// ============================================
exports.runCleanup = async (req, res, next) => {
  try {
    const result = await cacheService.scheduledCleanup();
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CLEAR BROWSER CACHE (HEADERS)
// ============================================
exports.clearBrowserCache = async (req, res, next) => {
  try {
    // This sets headers to prevent browser caching
    // Typically called when admin makes changes
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.status(200).json({
      success: true,
      message: "Browser cache headers set",
    });
  } catch (error) {
    next(error);
  }
};
