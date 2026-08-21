/**
 * Banner Controller
 * Banner management
 */

const { AppError } = require("../middleware/errorHandler");
const Banner = require("../models/Banner");
const cloudinary = require("../config/cloudinary");

/**
 * Upload image to Cloudinary using the same method as products
 */
const uploadImageToCloudinary = async (file) => {
  try {
    const axios = require("axios");
    const FormData = require("form-data");

    // ✅ Use the same Cloudinary upload preset as products
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes";

    // Convert buffer to base64
    const base64Image = file.buffer.toString("base64");
    const dataUrl = `data:${file.mimetype};base64,${base64Image}`;

    // Create form data
    const form = new FormData();
    form.append("file", dataUrl);
    form.append("upload_preset", uploadPreset);
    form.append("folder", "banners");

    // Send to Cloudinary
    const response = await axios.post(cloudinaryUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000,
    });

    const result = response.data;

    if (result.error) {
      console.error("❌ Cloudinary error:", result.error);
      throw new Error(result.error.message);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw new AppError("Failed to upload image", 500, "IMAGE_UPLOAD_FAILED");
  }
};

/**
 * Get active banners
 */
exports.getActiveBanners = async (req, res, next) => {
  try {
    const { position, limit } = req.query;

    const banners = await Banner.getActiveBanners(
      position,
      limit ? parseInt(limit) : null,
    );

    res.status(200).json({
      success: true,
      data: { banners },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get banners for section
 */
exports.getBannersForSection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const { position, limit } = req.query;

    const banners = await Banner.getBannersForSection(
      section,
      position,
      limit ? parseInt(limit) : null,
    );

    res.status(200).json({
      success: true,
      data: { banners },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record banner impression
 */
exports.recordImpression = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new AppError("Banner not found", 404, "BANNER_NOT_FOUND");
    }

    await banner.recordImpression();

    res.status(200).json({
      success: true,
      message: "Impression recorded",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record banner click
 */
exports.recordClick = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new AppError("Banner not found", 404, "BANNER_NOT_FOUND");
    }

    await banner.recordClick();

    res.status(200).json({
      success: true,
      data: {
        url: banner.link?.url || "/",
        openInNewTab: banner.link?.openInNewTab || false,
      },
      message: "Click recorded",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN BANNER CONTROLLERS
// ==========================================

/**
 * Create banner (Admin)
 */
exports.createBanner = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      description,
      link,
      position,
      order,
      section,
      visibility,
      startDate,
      endDate,
      scheduleType,
      recurring,
      recurringDays,
      status,
      style,
      targeting,
    } = req.body;

    // Validate required fields
    if (!title || !position) {
      throw new AppError(
        "Title and position are required",
        400,
        "MISSING_FIELDS",
      );
    }

    // ✅ Handle image upload using the same method as products
    let image = null;
    if (req.file) {
      try {
        const result = await uploadImageToCloudinary(req.file);
        image = {
          url: result.url,
          publicId: result.publicId,
          alt: title,
          width: result.width,
          height: result.height,
          size: result.size,
          format: result.format,
        };
        console.log("✅ Banner image uploaded successfully:", result.url);
      } catch (error) {
        console.error("❌ Image upload error:", error);
        throw new AppError(
          "Failed to upload image",
          500,
          "IMAGE_UPLOAD_FAILED",
        );
      }
    }

    if (!image) {
      throw new AppError("Banner image is required", 400, "MISSING_IMAGE");
    }

    const banner = new Banner({
      title,
      subtitle,
      description,
      image,
      link,
      position,
      order: parseInt(order) || 0,
      section: section || "homepage",
      visibility: visibility || {},
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      scheduleType: scheduleType || "always",
      recurring,
      recurringDays,
      status: status || "active",
      style: style || {},
      targeting: targeting || {},
      createdBy: req.user.id,
    });

    await banner.save();

    res.status(201).json({
      success: true,
      data: { banner },
      message: "Banner created successfully",
    });
  } catch (error) {
    console.error("❌ Create banner error:", error);
    next(error);
  }
};

/**
 * Get all banners (Admin)
 */
exports.getAllBanners = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      position,
      section,
      search,
      sortBy = "order",
      sortOrder = "asc",
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (position) query.position = position;
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ Use lean() to avoid virtual field issues
    const [banners, total] = await Promise.all([
      Banner.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: "createdBy",
          select: "name email",
          options: { lean: true }, // ✅ Use lean for populate
        })
        .lean(), // ✅ Use lean() to get plain objects
      Banner.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        banners,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("❌ Get all banners error:", error);
    next(error);
  }
};

/**
 * Get banner details (Admin)
 */
exports.getBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!banner) {
      throw new AppError("Banner not found", 404, "BANNER_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { banner },
    });
  } catch (error) {
    console.error("❌ Get banner error:", error);
    next(error);
  }
};

/**
 * Update banner (Admin)
 */
exports.updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new AppError("Banner not found", 404, "BANNER_NOT_FOUND");
    }

    // ✅ Handle image update using the same method as products
    if (req.file) {
      try {
        // Delete old image from Cloudinary if exists
        if (banner.image.publicId) {
          try {
            const cloudinary = require("cloudinary").v2;
            cloudinary.config({
              cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
              api_key: process.env.CLOUDINARY_API_KEY,
              api_secret: process.env.CLOUDINARY_API_SECRET,
              secure: true,
            });
            await cloudinary.uploader.destroy(banner.image.publicId);
            console.log("🗑️ Deleted old banner image:", banner.image.publicId);
          } catch (deleteError) {
            console.log("⚠️ Could not delete old image:", deleteError.message);
          }
        }

        // Upload new image
        const result = await uploadImageToCloudinary(req.file);
        banner.image = {
          url: result.url,
          publicId: result.publicId,
          alt: updates.title || banner.title,
          width: result.width,
          height: result.height,
          size: result.size,
          format: result.format,
        };
        console.log("✅ Banner image updated successfully:", result.url);
      } catch (error) {
        console.error("❌ Image upload error:", error);
        throw new AppError(
          "Failed to upload image",
          500,
          "IMAGE_UPLOAD_FAILED",
        );
      }
    }

    // Update fields
    const allowedUpdates = [
      "title",
      "subtitle",
      "description",
      "link",
      "position",
      "order",
      "section",
      "visibility",
      "startDate",
      "endDate",
      "scheduleType",
      "recurring",
      "recurringDays",
      "status",
      "style",
      "targeting",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        banner[field] = updates[field];
      }
    });

    banner.updatedBy = req.user.id;
    await banner.save();

    res.status(200).json({
      success: true,
      data: { banner },
      message: "Banner updated successfully",
    });
  } catch (error) {
    console.error("❌ Update banner error:", error);
    next(error);
  }
};

/**
 * Delete banner (Admin)
 */
exports.deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new AppError("Banner not found", 404, "BANNER_NOT_FOUND");
    }

    // Delete image from Cloudinary
    if (banner.image.publicId) {
      try {
        const cloudinary = require("cloudinary").v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        });
        await cloudinary.uploader.destroy(banner.image.publicId);
        console.log("🗑️ Deleted banner image:", banner.image.publicId);
      } catch (deleteError) {
        console.log("⚠️ Could not delete image:", deleteError.message);
      }
    }

    await banner.deleteOne();

    res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete banner error:", error);
    next(error);
  }
};

/**
 * Reorder banners (Admin)
 */
exports.reorderBanners = async (req, res, next) => {
  try {
    const { order } = req.body;

    if (!order || !Array.isArray(order)) {
      throw new AppError("Order array is required", 400, "MISSING_ORDER");
    }

    for (const item of order) {
      await Banner.findByIdAndUpdate(item.id, {
        order: item.position,
      });
    }

    res.status(200).json({
      success: true,
      message: "Banners reordered successfully",
    });
  } catch (error) {
    console.error("❌ Reorder banners error:", error);
    next(error);
  }
};

/**
 * Get banner analytics (Admin)
 */
exports.getBannerAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await Banner.getAnalyticsSummary(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("❌ Get banner analytics error:", error);
    next(error);
  }
};
