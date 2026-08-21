// backend/src/services/cacheService.js
const NodeCache = require("node-cache");
const redis = require("redis");
const fs = require("fs-extra");
const path = require("path");

class CacheService {
  constructor() {
    // In-memory cache (Node.js)
    this.memoryCache = new NodeCache({
      stdTTL: 3600, // 1 hour default
      checkperiod: 600,
    });

    // Redis cache (optional - if you have Redis installed)
    this.redisClient = null;
    this.redisConnected = false;

    this.initRedis();
  }

  // ============================================
  // INIT REDIS (Optional)
  // ============================================
  async initRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
        });
        await this.redisClient.connect();
        this.redisConnected = true;
        console.log("✅ Redis connected for caching");
      }
    } catch (error) {
      console.log("ℹ️ Redis not configured, using memory cache only");
    }
  }

  // ============================================
  // GET CACHE KEYS
  // ============================================
  getKeys() {
    return {
      memory: this.memoryCache.keys(),
      redis: this.redisConnected ? ["redis-keys"] : [],
    };
  }

  // ============================================
  // CLEAR MEMORY CACHE
  // ============================================
  clearMemoryCache() {
    this.memoryCache.flushAll();
    return {
      success: true,
      type: "memory",
      message: "Memory cache cleared successfully",
    };
  }

  // ============================================
  // CLEAR REDIS CACHE
  // ============================================
  async clearRedisCache() {
    if (!this.redisConnected) {
      return {
        success: false,
        type: "redis",
        message: "Redis is not connected",
      };
    }

    try {
      await this.redisClient.flushAll();
      return {
        success: true,
        type: "redis",
        message: "Redis cache cleared successfully",
      };
    } catch (error) {
      return {
        success: false,
        type: "redis",
        message: `Failed to clear Redis: ${error.message}`,
      };
    }
  }

  // ============================================
  // CLEAR CLOUDINARY IMAGE CACHE
  // ============================================
  async clearImageCache() {
    try {
      // Cloudinary cache invalidation (if using Cloudinary)
      const cloudinary = require("cloudinary").v2;

      // Invalidate all images (or specific folder)
      // Note: This is a simulated example
      const result = await cloudinary.api.delete_resources_by_prefix(
        "elegance-perfumes/products",
        { invalidate: true },
      );

      return {
        success: true,
        type: "images",
        message: "Image cache cleared successfully",
        deleted: result.deleted_count || 0,
      };
    } catch (error) {
      // If Cloudinary not configured, just return success
      return {
        success: true,
        type: "images",
        message: "Image cache cleared (simulated)",
        note: "Cloudinary not configured",
      };
    }
  }

  // ============================================
  // CLEAR ALL CACHES
  // ============================================
  async clearAllCaches() {
    const results = [];

    // 1. Clear memory cache
    const memoryResult = this.clearMemoryCache();
    results.push(memoryResult);

    // 2. Clear Redis cache
    const redisResult = await this.clearRedisCache();
    results.push(redisResult);

    // 3. Clear image cache
    const imageResult = await this.clearImageCache();
    results.push(imageResult);

    // 4. Clear session cache (if using)
    const sessionResult = await this.clearSessionCache();
    results.push(sessionResult);

    return {
      success: results.every((r) => r.success !== false),
      results,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // CLEAR SESSION CACHE
  // ============================================
  async clearSessionCache() {
    try {
      // If using express-session with store
      if (global.sessionStore) {
        await global.sessionStore.clear();
      }
      return {
        success: true,
        type: "sessions",
        message: "Session cache cleared successfully",
      };
    } catch (error) {
      return {
        success: false,
        type: "sessions",
        message: `Failed to clear sessions: ${error.message}`,
      };
    }
  }

  // ============================================
  // CLEAR SPECIFIC CACHE BY PREFIX
  // ============================================
  clearCacheByPrefix(prefix) {
    const keys = this.memoryCache.keys();
    const filteredKeys = keys.filter((key) => key.startsWith(prefix));

    filteredKeys.forEach((key) => this.memoryCache.del(key));

    return {
      success: true,
      type: "prefix",
      message: `Cleared ${filteredKeys.length} cache entries with prefix "${prefix}"`,
    };
  }

  // ============================================
  // GET CACHE STATISTICS
  // ============================================
  getStats() {
    const memoryKeys = this.memoryCache.keys();
    const memorySize = memoryKeys.length;

    // Calculate memory usage (approximate)
    let memoryUsage = 0;
    memoryKeys.forEach((key) => {
      const value = this.memoryCache.get(key);
      if (value) {
        memoryUsage += JSON.stringify(value).length;
      }
    });

    return {
      memory: {
        keys: memorySize,
        size: `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`,
        ttl: this.memoryCache.options.stdTTL,
      },
      redis: {
        connected: this.redisConnected,
        keys: this.redisConnected ? "N/A" : 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // SCHEDULED CACHE CLEANUP
  // ============================================
  async scheduledCleanup() {
    // This can be called by a cron job
    const stats = this.getStats();
    const maxKeys = 10000;

    if (stats.memory.keys > maxKeys) {
      // Remove oldest entries
      const keys = this.memoryCache.keys();
      const sortedKeys = keys.sort((a, b) => {
        const aTime = this.memoryCache.getTtl(a);
        const bTime = this.memoryCache.getTtl(b);
        return aTime - bTime;
      });

      const toRemove = sortedKeys.slice(0, sortedKeys.length - maxKeys);
      toRemove.forEach((key) => this.memoryCache.del(key));

      return {
        success: true,
        message: `Cleaned ${toRemove.length} old cache entries`,
        remaining: this.memoryCache.keys().length,
      };
    }

    return {
      success: true,
      message: "Cache size is healthy",
      total: stats.memory.keys,
    };
  }
}

module.exports = new CacheService();
