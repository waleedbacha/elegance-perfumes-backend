/**
 * Cloudinary Configuration
 * Image upload and management with advanced error handling
 */

const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { AppError } = require("../middleware/errorHandler");
const logger = require("../middleware/logger");

class CloudinaryConfig {
  constructor() {
    this.initialized = false;
    this.config = null;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  /**
   * Initialize Cloudinary with validation
   */
  initialize() {
    if (this.initialized && this.config) {
      return this.config;
    }

    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
      timeout: 60000, // 60 seconds timeout
    };

    // ✅ Validate configuration
    const missingFields = [];
    if (!config.cloud_name) missingFields.push("CLOUDINARY_CLOUD_NAME");
    if (!config.api_key) missingFields.push("CLOUDINARY_API_KEY");
    if (!config.api_secret) missingFields.push("CLOUDINARY_API_SECRET");

    if (missingFields.length > 0) {
      const errorMsg = `⚠️ Cloudinary configuration incomplete. Missing: ${missingFields.join(", ")}`;
      logger.warn(errorMsg);
      console.error(`❌ ${errorMsg}`);
      console.error("📌 Please add these to your .env file");
      return null;
    }

    try {
      cloudinary.config(config);
      this.config = config;
      this.initialized = true;

      logger.info("☁️ Cloudinary initialized successfully");
      console.log(`📌 Cloud Name: ${config.cloud_name}`);
      console.log(`📌 API Key: ${config.api_key.substring(0, 8)}...`);

      return this.config;
    } catch (error) {
      logger.error("❌ Cloudinary initialization failed:", error);
      console.error("❌ Failed to initialize Cloudinary:", error.message);
      return null;
    }
  }

  /**
   * Upload image with retry logic and advanced error handling
   */
  async uploadImage(file, folder = "elegance", options = {}) {
    const maxRetries = this.retryAttempts;
    let lastError = null;

    // ✅ Validate initialization
    const config = this.initialize();
    if (!config) {
      throw new AppError(
        "Cloudinary is not configured. Please check your credentials.",
        500,
        "CLOUDINARY_NOT_CONFIGURED",
      );
    }

    // ✅ Validate file
    if (!file) {
      throw new AppError("No file provided", 400, "NO_FILE");
    }

    // ✅ Log upload attempt
    console.log(`📸 Uploading to Cloudinary: ${folder}/`);
    console.log(`📸 File: ${file.originalname || "unknown"}`);
    console.log(`📸 Size: ${file.size || file.buffer?.length || 0} bytes`);
    console.log(`📸 Type: ${file.mimetype || "unknown"}`);

    // ✅ Prepare upload options
    const uploadOptions = {
      folder: folder,
      resource_type: "auto",
      transformation: [
        { quality: "auto:best" },
        { fetch_format: "auto" },
        ...(options.transformations || []),
      ],
      timeout: 60000,
      ...options,
    };

    // ✅ Retry logic
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Upload attempt ${attempt}/${maxRetries}...`);

        const result = await this._performUpload(file, uploadOptions);

        console.log(`✅ Upload successful! (Attempt ${attempt})`);
        console.log(`📸 Public ID: ${result.publicId}`);
        console.log(`📸 URL: ${result.url.substring(0, 60)}...`);

        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ Upload attempt ${attempt} failed:`, error.message);

        // ✅ Handle specific errors
        if (error.http_code === 403) {
          console.error(
            "🔒 Authentication failed. Please check your Cloudinary credentials.",
          );
          throw new AppError(
            "Cloudinary authentication failed. Please check your API credentials.",
            403,
            "CLOUDINARY_AUTH_FAILED",
          );
        }

        if (error.http_code === 404) {
          console.error("🔍 Cloudinary resource not found.");
          throw new AppError(
            "Cloudinary resource not found.",
            404,
            "CLOUDINARY_NOT_FOUND",
          );
        }

        if (error.http_code === 400) {
          console.error("📝 Bad request to Cloudinary:", error.message);
          throw new AppError(
            `Invalid upload request: ${error.message}`,
            400,
            "CLOUDINARY_BAD_REQUEST",
          );
        }

        // ✅ Retry on timeout or server errors
        if (
          attempt < maxRetries &&
          (error.message?.includes("timeout") ||
            error.message?.includes("ECONNRESET") ||
            error.http_code >= 500)
        ) {
          const delay = this.retryDelay * attempt;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this._delay(delay);
          continue;
        }

        // ✅ Don't retry on client errors (4xx)
        if (error.http_code >= 400 && error.http_code < 500) {
          throw new AppError(
            `Cloudinary upload failed: ${error.message}`,
            error.http_code || 400,
            "CLOUDINARY_UPLOAD_FAILED",
          );
        }

        // ✅ If all retries failed
        if (attempt === maxRetries) {
          console.error(`❌ All ${maxRetries} upload attempts failed.`);
          throw new AppError(
            `Upload failed after ${maxRetries} attempts: ${error.message}`,
            500,
            "CLOUDINARY_UPLOAD_FAILED",
          );
        }

        // ✅ Generic retry
        const delay = this.retryDelay * attempt;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this._delay(delay);
      }
    }

    throw new AppError(
      `Upload failed: ${lastError?.message || "Unknown error"}`,
      500,
      "CLOUDINARY_UPLOAD_FAILED",
    );
  }

  /**
   * Perform actual upload to Cloudinary
   * @private
   */
  _performUpload(file, uploadOptions) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            // ✅ Enhance error with additional info
            error.http_code = error.http_code || 500;
            error.timestamp = new Date().toISOString();
            reject(error);
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              size: result.bytes,
              format: result.format,
              resourceType: result.resource_type,
              createdAt: result.created_at,
              metadata: {
                originalFilename: result.original_filename,
                ...result.metadata,
              },
            });
          }
        },
      );

      // ✅ Handle different file input types
      try {
        if (file.buffer) {
          // Memory storage (multer with memoryStorage)
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        } else if (file.path) {
          // Disk storage (multer with diskStorage)
          uploadStream.end(file.path);
        } else if (file.stream) {
          // Stream
          file.stream.pipe(uploadStream);
        } else if (typeof file === "string") {
          // URL or file path string
          uploadStream.end(file);
        } else if (file._readableState) {
          // Readable stream
          file.pipe(uploadStream);
        } else {
          reject(
            new Error("Invalid file input: No buffer, path, or stream found"),
          );
        }
      } catch (streamError) {
        console.error("❌ Stream error:", streamError);
        reject(new Error(`Stream error: ${streamError.message}`));
      }
    });
  }

  /**
   * Delay helper for retry logic
   * @private
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Upload multiple images with concurrent limit
   */
  async uploadMultipleImages(files, folder = "elegance", options = {}) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return [];
    }

    console.log(`📸 Uploading ${files.length} images to Cloudinary...`);

    const results = [];
    const errors = [];
    const concurrencyLimit = 5; // Upload 5 at a time

    for (let i = 0; i < files.length; i += concurrencyLimit) {
      const chunk = files.slice(i, i + concurrencyLimit);

      const chunkPromises = chunk.map(async (file, index) => {
        try {
          console.log(
            `📸 Uploading ${i + index + 1}/${files.length}: ${file.originalname || "unknown"}`,
          );
          const result = await this.uploadImage(file, folder, options);
          return { success: true, result, index: i + index };
        } catch (error) {
          console.error(`❌ Failed to upload ${i + index + 1}:`, error.message);
          errors.push({ index: i + index, error: error.message });
          return { success: false, error, index: i + index };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      chunkResults.forEach((item) => {
        if (item.success) {
          results.push(item.result);
        }
      });
    }

    console.log(
      `✅ Uploaded ${results.length}/${files.length} images successfully`,
    );

    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} images failed to upload:`, errors);
    }

    return results;
  }

  /**
   * Delete image with retry logic
   */
  async deleteImage(publicId) {
    try {
      if (!publicId) {
        console.warn("⚠️ No publicId provided for deletion");
        return null;
      }

      this.initialize();

      console.log(`🗑️ Deleting image from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === "ok") {
        console.log(`✅ Image deleted successfully: ${publicId}`);
      } else {
        console.warn(`⚠️ Image deletion returned: ${result.result}`);
      }

      return result;
    } catch (error) {
      console.error("❌ Cloudinary delete error:", error);
      throw new AppError(
        `Failed to delete image: ${error.message}`,
        500,
        "CLOUDINARY_DELETE_FAILED",
      );
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(publicIds) {
    try {
      if (!publicIds || publicIds.length === 0) {
        return [];
      }

      console.log(`🗑️ Deleting ${publicIds.length} images from Cloudinary...`);

      const results = [];
      for (const publicId of publicIds) {
        try {
          const result = await this.deleteImage(publicId);
          results.push({ publicId, success: true, result });
        } catch (error) {
          console.error(`❌ Failed to delete ${publicId}:`, error.message);
          results.push({ publicId, success: false, error: error.message });
        }
      }

      const successful = results.filter((r) => r.success).length;
      console.log(
        `✅ Deleted ${successful}/${publicIds.length} images successfully`,
      );

      return results;
    } catch (error) {
      console.error("❌ Cloudinary multiple delete error:", error);
      throw new AppError(
        "Failed to delete images",
        500,
        "CLOUDINARY_DELETE_FAILED",
      );
    }
  }

  /**
   * Update image (delete old, upload new)
   */
  async updateImage(publicId, file, options = {}) {
    try {
      console.log(`🔄 Updating image: ${publicId}`);

      // Delete old image
      await this.deleteImage(publicId);

      // Upload new image
      const result = await this.uploadImage(
        file,
        options.folder || "elegance",
        options,
      );

      console.log(`✅ Image updated successfully: ${result.publicId}`);
      return result;
    } catch (error) {
      console.error("❌ Cloudinary update error:", error);
      throw new AppError(
        `Failed to update image: ${error.message}`,
        500,
        "CLOUDINARY_UPDATE_FAILED",
      );
    }
  }

  /**
   * Get image URL with transformations
   */
  getImageUrl(publicId, transformations = {}) {
    try {
      this.initialize();

      const options = {
        secure: true,
        ...transformations,
      };

      return cloudinary.url(publicId, options);
    } catch (error) {
      console.error("❌ Cloudinary URL generation error:", error);
      return null;
    }
  }

  /**
   * Get image info
   */
  async getImageInfo(publicId) {
    try {
      this.initialize();

      const result = await cloudinary.api.resource(publicId);

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        size: result.bytes,
        format: result.format,
        resourceType: result.resource_type,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        tags: result.tags,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error("❌ Cloudinary resource info error:", error);
      return null;
    }
  }

  /**
   * Search images
   */
  async searchImages(query, options = {}) {
    try {
      this.initialize();

      const result = await cloudinary.search
        .expression(query)
        .maxResults(options.maxResults || 10)
        .nextCursor(options.nextCursor)
        .execute();

      return {
        resources: result.resources.map((r) => ({
          publicId: r.public_id,
          url: r.secure_url,
          width: r.width,
          height: r.height,
          size: r.bytes,
          format: r.format,
          createdAt: r.created_at,
        })),
        totalCount: result.total_count,
        nextCursor: result.next_cursor,
      };
    } catch (error) {
      console.error("❌ Cloudinary search error:", error);
      return { resources: [], totalCount: 0 };
    }
  }

  /**
   * Get upload presets
   */
  async getUploadPresets() {
    try {
      this.initialize();

      const result = await cloudinary.api.upload_presets();
      return result.presets || [];
    } catch (error) {
      console.error("❌ Cloudinary upload presets error:", error);
      return [];
    }
  }

  /**
   * Create upload preset
   */
  async createUploadPreset(name, options = {}) {
    try {
      this.initialize();

      const result = await cloudinary.api.create_upload_preset({
        name,
        folder: options.folder || "elegance",
        ...options,
      });

      return result;
    } catch (error) {
      console.error("❌ Cloudinary create upload preset error:", error);
      throw new AppError(
        "Failed to create upload preset",
        500,
        "CLOUDINARY_PRESET_FAILED",
      );
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage() {
    try {
      this.initialize();

      const result = await cloudinary.api.usage();
      return result;
    } catch (error) {
      console.error("❌ Cloudinary usage stats error:", error);
      return null;
    }
  }

  /**
   * Health check with detailed status
   */
  async healthCheck() {
    try {
      console.log("🏥 Running Cloudinary health check...");

      this.initialize();

      // Try to get usage to check connection
      const usage = await cloudinary.api.usage();

      return {
        healthy: true,
        cloud_name: this.config?.cloud_name,
        usage: {
          storage: usage.storage_used,
          bandwidth: usage.bandwidth_used,
          requests: usage.requests,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Cloudinary health check failed:", error.message);
      return {
        healthy: false,
        error: error.message,
        http_code: error.http_code,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
module.exports = new CloudinaryConfig();
