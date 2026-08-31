/**
 * Category Controller
 * Category management for admin and public
 */

const { AppError } = require("../middleware/errorHandler");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * Get all active categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({
      order: 1,
    });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    console.error("❌ Get categories error:", error);
    next(error);
  }
};

/**
 * Get category by name
 */
exports.getCategoryByName = async (req, res, next) => {
  try {
    const { name } = req.params;
    const category = await Category.getByName(name);

    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get all categories (Admin)
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category (Admin)
 */
exports.getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create category (Admin) - FIXED with axios approach
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, displayName, description, gradient, order } = req.body;

    // Check if category exists
    const existing = await Category.findOne({ name: name.toLowerCase() });
    if (existing) {
      throw new AppError("Category already exists", 409, "CATEGORY_EXISTS");
    }

    // ==========================================
    // ✅ HANDLE IMAGE UPLOAD - SAME AS PRODUCTS & REVIEWS
    // ==========================================
    let image = null;
    if (req.file) {
      try {
        console.log(`📸 Uploading category image: ${req.file.originalname}`);

        const axios = require("axios");
        const FormData = require("form-data");

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        // Convert buffer to base64
        const base64Image = req.file.buffer.toString("base64");
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        // Create form data
        const form = new FormData();
        form.append("file", dataUrl);
        form.append(
          "upload_preset",
          process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes",
        );
        form.append("folder", "elegance-perfumes/categories");

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

        image = {
          url: result.secure_url,
          publicId: result.public_id,
          alt: displayName || name,
        };

        console.log(`✅ Category image uploaded: ${result.secure_url}`);
      } catch (uploadError) {
        console.error("❌ Image upload failed:", uploadError.message);
        // Continue without image - will use default
      }
    }

    // If no image uploaded, use default
    if (!image) {
      const defaultImages = {
        men: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=600&fit=crop",
        women:
          "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&h=600&fit=crop",
        unisex:
          "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&h=600&fit=crop",
      };
      image = {
        url:
          defaultImages[name.toLowerCase()] ||
          "https://via.placeholder.com/800x600",
        publicId: `default/${name}`,
        alt: displayName || name,
      };
    }

    const category = new Category({
      name: name.toLowerCase(),
      displayName,
      description,
      gradient: gradient || "rgba(139, 0, 0, 0.85)",
      order: parseInt(order) || 0,
      image,
      isActive: true,
    });

    await category.save();

    res.status(201).json({
      success: true,
      data: { category },
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("❌ Create category error:", error);
    next(error);
  }
};

/**
 * Update category (Admin) - FIXED
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { displayName, description, gradient, order, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    // Update fields
    if (displayName) category.displayName = displayName;
    if (description) category.description = description;
    if (gradient) category.gradient = gradient;
    if (order !== undefined) category.order = parseInt(order);
    if (isActive !== undefined) category.isActive = isActive;

    // Handle image update - using axios approach
    if (req.file) {
      try {
        console.log(`📸 Updating category image: ${req.file.originalname}`);

        const axios = require("axios");
        const FormData = require("form-data");

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        const base64Image = req.file.buffer.toString("base64");
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const form = new FormData();
        form.append("file", dataUrl);
        form.append(
          "upload_preset",
          process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes",
        );
        form.append("folder", "elegance-perfumes/categories");

        const response = await axios.post(cloudinaryUrl, form, {
          headers: { ...form.getHeaders() },
          timeout: 60000,
        });

        const result = response.data;

        if (result.error) {
          console.error("❌ Cloudinary error:", result.error);
          throw new Error(result.error.message);
        }

        // Delete old image from Cloudinary if not default
        if (
          category.image?.publicId &&
          !category.image.publicId.startsWith("default/")
        ) {
          try {
            const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
            const crypto = require("crypto");
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = crypto
              .createHash("sha256")
              .update(
                `public_id=${category.image.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
              )
              .digest("hex");

            await axios.post(deleteUrl, {
              public_id: category.image.publicId,
              timestamp: timestamp,
              signature: signature,
              api_key: process.env.CLOUDINARY_API_KEY,
            });
            console.log(`🗑️ Deleted old image: ${category.image.publicId}`);
          } catch (deleteError) {
            console.error(
              "❌ Failed to delete old image:",
              deleteError.message,
            );
          }
        }

        category.image = {
          url: result.secure_url,
          publicId: result.public_id,
          alt: category.displayName,
        };

        console.log(`✅ Category image updated: ${result.secure_url}`);
      } catch (uploadError) {
        console.error("❌ Image upload failed:", uploadError.message);
        // Continue without updating image
      }
    }

    await category.save();

    res.status(200).json({
      success: true,
      data: { category },
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("❌ Update category error:", error);
    next(error);
  }
};

/**
 * Delete category (Admin)
 */
// backend/src/controllers/categoryController.js

/**
 * Delete category (Admin) - FIXED
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      throw new AppError("Category not found", 404, "CATEGORY_NOT_FOUND");
    }

    // ✅ Try to delete image from Cloudinary - but don't fail if it doesn't work
    if (
      category.image?.publicId &&
      !category.image.publicId.startsWith("default/")
    ) {
      try {
        await cloudinary.deleteImage(category.image.publicId);
        console.log(
          `✅ Image deleted from Cloudinary: ${category.image.publicId}`,
        );
      } catch (deleteError) {
        // ✅ Log but continue - don't fail the delete
        console.error("❌ Cloudinary delete error:", deleteError.message);
        console.log("⚠️ Continuing with category deletion...");
        // Image deletion failed, but we still want to delete the category
      }
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      // ✅ Include warning about image deletion
      ...(category.image?.publicId &&
        !category.image.publicId.startsWith("default/") && {
          warning:
            "Category deleted but image may still exist in Cloudinary. Please check manually.",
        }),
    });
  } catch (error) {
    console.error("❌ Delete category error:", error);
    next(error);
  }
};
/**
 * Bulk update category order
 */
exports.reorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      throw new AppError("Categories array is required", 400, "INVALID_DATA");
    }

    for (const item of categories) {
      await Category.findByIdAndUpdate(item.id, { order: item.order });
    }

    res.status(200).json({
      success: true,
      message: "Categories reordered successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default categories
 */
exports.seedCategories = async (req, res, next) => {
  try {
    await Category.seedDefaults();

    res.status(200).json({
      success: true,
      message: "Default categories seeded successfully",
    });
  } catch (error) {
    next(error);
  }
};
