/**
 * Redis Configuration
 * Caching and session management
 */

const redis = require("redis");
const { promisify } = require("util");
const logger = require("../middleware/logger");

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isEnabled = false;
  }

  /**
   * Initialize Redis
   */
  initialize() {
    if (this.client) {
      return this.client;
    }

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const redisPassword = process.env.REDIS_PASSWORD;

    // Check if Redis is enabled
    if (!process.env.REDIS_ENABLED || process.env.REDIS_ENABLED !== "true") {
      logger.info("📦 Redis is disabled");
      this.isEnabled = false;
      return null;
    }

    this.isEnabled = true;

    const options = {
      url: redisUrl,
      socket: {
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
        keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE) || 30000,
        tls: process.env.REDIS_TLS === "true",
      },
      retry_strategy: this.getRetryStrategy(),
    };

    if (redisPassword) {
      options.password = redisPassword;
    }

    this.client = redis.createClient(options);

    // Setup event listeners
    this.setupEventListeners();

    return this.client;
  }

  /**
   * Get retry strategy
   */
  getRetryStrategy() {
    return (options) => {
      if (options.error && options.error.code === "ECONNREFUSED") {
        logger.warn("⚠️ Redis connection refused. Retrying...");
        return 5000; // Retry after 5 seconds
      }

      if (options.total_retry_time > 60000) {
        logger.warn("⚠️ Redis retry time exhausted");
        return undefined;
      }

      return Math.min(options.attempt * 100, 3000);
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (!this.client) return;

    this.client.on("connect", () => {
      logger.info("📦 Redis connected");
    });

    this.client.on("ready", () => {
      this.isConnected = true;
      logger.info("📦 Redis ready");
    });

    this.client.on("error", (error) => {
      this.isConnected = false;
      logger.error("❌ Redis error:", error.message);
    });

    this.client.on("end", () => {
      this.isConnected = false;
      logger.warn("📦 Redis connection ended");
    });

    this.client.on("reconnecting", () => {
      logger.info("📦 Redis reconnecting...");
    });
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (!this.isEnabled) {
      return null;
    }

    try {
      this.initialize();

      if (!this.client) {
        throw new Error("Redis client not initialized");
      }

      await this.client.connect();
      this.isConnected = true;

      logger.info("📦 Redis connected successfully");

      return this.client;
    } catch (error) {
      logger.error("❌ Redis connection failed:", error.message);
      this.isConnected = false;

      if (process.env.NODE_ENV === "development") {
        logger.warn("⚠️ Continuing without Redis in development mode");
        return null;
      }

      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info("📦 Redis disconnected");
    } catch (error) {
      logger.error("❌ Redis disconnection error:", error.message);
    }
  }

  /**
   * Set cache value
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }

      return true;
    } catch (error) {
      logger.error("Redis set error:", error.message);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      // Try to parse JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error("Redis get error:", error.message);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error("Redis delete error:", error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      logger.error("Redis exists error:", error.message);
      return false;
    }
  }

  /**
   * Set hash field
   */
  async hset(key, field, value) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);
      return await this.client.hSet(key, field, stringValue);
    } catch (error) {
      logger.error("Redis hset error:", error.message);
      return null;
    }
  }

  /**
   * Get hash field
   */
  async hget(key, field) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.client.hGet(key, field);

      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error("Redis hget error:", error.message);
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const result = await this.client.hGetAll(key);

      if (!result) {
        return null;
      }

      // Parse JSON values
      const parsed = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }

      return parsed;
    } catch (error) {
      logger.error("Redis hgetall error:", error.message);
      return null;
    }
  }

  /**
   * Delete hash field
   */
  async hdel(key, field) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.hDel(key, field);
      return true;
    } catch (error) {
      logger.error("Redis hdel error:", error.message);
      return false;
    }
  }

  /**
   * Add to set
   */
  async sadd(key, member) {
    if (!this.isConnected) {
      return false;
    }

    try {
      return await this.client.sAdd(key, member);
    } catch (error) {
      logger.error("Redis sadd error:", error.message);
      return false;
    }
  }

  /**
   * Check if member in set
   */
  async sismember(key, member) {
    if (!this.isConnected) {
      return false;
    }

    try {
      return await this.client.sIsMember(key, member);
    } catch (error) {
      logger.error("Redis sismember error:", error.message);
      return false;
    }
  }

  /**
   * Get set members
   */
  async smembers(key) {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error("Redis smembers error:", error.message);
      return [];
    }
  }

  /**
   * Increment value
   */
  async incr(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error("Redis incr error:", error.message);
      return null;
    }
  }

  /**
   * Get TTL of key
   */
  async ttl(key) {
    if (!this.isConnected) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error("Redis ttl error:", error.message);
      return -1;
    }
  }

  /**
   * Flush database (development only)
   */
  async flushDb() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot flush database in production");
    }

    if (!this.isConnected) {
      throw new Error("Redis not connected");
    }

    try {
      await this.client.flushDb();
      logger.warn("📦 Redis database flushed");
    } catch (error) {
      logger.error("❌ Redis flush error:", error.message);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isEnabled) {
      return { healthy: true, disabled: true };
    }

    if (!this.isConnected) {
      return { healthy: false, error: "Redis not connected" };
    }

    try {
      await this.client.ping();
      return {
        healthy: true,
        info: {
          connected: this.isConnected,
          enabled: this.isEnabled,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new RedisConfig();
