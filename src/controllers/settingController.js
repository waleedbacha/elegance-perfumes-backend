const { AppError } = require("../middleware/errorHandler");
const Setting = require("../models/Setting");
const cloudinary = require("../config/cloudinary");

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * Get public settings by group
 */
exports.getPublicSettings = async (req, res, next) => {
  try {
    const { group } = req.params;
    console.log(`🔍 Fetching public settings for group: ${group}`);

    const settings = await Setting.find({ group, isPublic: true });
    console.log(`📤 Found ${settings.length} settings for group: ${group}`);

    const result = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    console.log(`📤 Result:`, result);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Get public settings error:", error);
    next(error);
  }
};

/**
 * Get single public setting
 */
exports.getPublicSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key, isPublic: true });

    if (!setting) {
      throw new AppError("Setting not found", 404, "SETTING_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { key: setting.key, value: setting.value },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get all settings (Admin)
 */
exports.getAllSettings = async (req, res, next) => {
  try {
    const { group } = req.query;
    const filter = group ? { group } : {};
    const settings = await Setting.find(filter).sort({ group: 1, key: 1 });

    res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get setting by key (Admin)
 */
exports.getSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });

    if (!setting) {
      throw new AppError("Setting not found", 404, "SETTING_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { setting },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update setting (Admin)
 */
/**
 * Create or update setting (Admin)
 */
exports.setSetting = async (req, res, next) => {
  try {
    const { key, value, type, group, description, isPublic } = req.body;

    if (!key) {
      throw new AppError("Key is required", 400, "KEY_REQUIRED");
    }

    let setting = await Setting.findOne({ key });

    // Parse value based on type
    let parsedValue = value;
    const settingType = type || "string";

    // ✅ Handle null/undefined values for image type
    if (
      settingType === "image" &&
      (value === null || value === undefined || value === "")
    ) {
      // If removing image, set to null
      parsedValue = null;
    } else if (settingType === "boolean") {
      parsedValue = value === true || value === "true" || value === 1;
    } else if (settingType === "number") {
      parsedValue = parseFloat(value);
    } else if (settingType === "image" && typeof value === "string") {
      parsedValue = value; // Keep as string URL
    }

    if (setting) {
      // ✅ For image type with null value, we need to handle specially
      if (settingType === "image" && parsedValue === null) {
        // Remove the image by setting value to null or empty object
        setting.value = null;
        setting.type = settingType || setting.type;
        setting.group = group || setting.group;
        setting.description = description || setting.description;
        setting.isPublic = isPublic !== undefined ? isPublic : true;
      } else {
        setting.value = parsedValue !== undefined ? parsedValue : setting.value;
        setting.type = settingType || setting.type;
        setting.group = group || setting.group;
        setting.description = description || setting.description;
        setting.isPublic = isPublic !== undefined ? isPublic : true;
      }
    } else {
      // ✅ Only create if value is not null
      if (parsedValue === null && settingType === "image") {
        // Don't create a setting with null value
        throw new AppError(
          "Cannot create setting with null value",
          400,
          "INVALID_VALUE",
        );
      }

      setting = new Setting({
        key,
        value: parsedValue,
        type: settingType,
        group: group || "general",
        description: description || "",
        isPublic: isPublic !== undefined ? isPublic : true,
      });
    }

    await setting.save();

    res.status(200).json({
      success: true,
      data: setting,
      message: "Setting saved successfully",
    });
  } catch (error) {
    console.error("❌ Set setting error:", error);
    next(error);
  }
};

/**
 * Upload image for setting (Admin)
 */
/**
 * Upload image for setting (Admin)
 */
exports.uploadSettingImage = async (req, res, next) => {
  try {
    const { key } = req.body;

    if (!key) {
      throw new AppError("Key is required", 400, "KEY_REQUIRED");
    }

    // ✅ If no file, remove the image
    if (!req.file) {
      console.log(`🗑️ Removing image for setting: ${key}`);

      let setting = await Setting.findOne({ key });

      if (setting) {
        // Delete old image from Cloudinary if exists
        if (setting.value?.publicId) {
          try {
            const axios = require("axios");
            const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
            const timestamp = Math.floor(Date.now() / 1000);
            const crypto = require("crypto");
            const signature = crypto
              .createHash("sha256")
              .update(
                `public_id=${setting.value.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
              )
              .digest("hex");

            await axios.post(deleteUrl, {
              public_id: setting.value.publicId,
              timestamp: timestamp,
              signature: signature,
              api_key: process.env.CLOUDINARY_API_KEY,
            });
            console.log(`🗑️ Deleted old image: ${setting.value.publicId}`);
          } catch (deleteError) {
            console.error(
              "❌ Failed to delete old image:",
              deleteError.message,
            );
          }
        }

        // Set value to null or empty object
        setting.value = null;
        await setting.save();

        res.status(200).json({
          success: true,
          data: { setting },
          message: "Image removed successfully",
        });
        return;
      } else {
        throw new AppError("Setting not found", 404, "SETTING_NOT_FOUND");
      }
    }

    console.log(`📸 Uploading image for setting: ${key}`);

    // Upload to Cloudinary
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
    form.append("folder", "elegance-perfumes/settings");

    const response = await axios.post(cloudinaryUrl, form, {
      headers: { ...form.getHeaders() },
      timeout: 60000,
    });

    const result = response.data;

    const imageData = {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
    };

    // Find or create setting
    let setting = await Setting.findOne({ key });

    if (setting) {
      // Delete old image if exists
      if (setting.value?.publicId) {
        try {
          const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
          const timestamp = Math.floor(Date.now() / 1000);
          const crypto = require("crypto");
          const signature = crypto
            .createHash("sha256")
            .update(
              `public_id=${setting.value.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
            )
            .digest("hex");

          await axios.post(deleteUrl, {
            public_id: setting.value.publicId,
            timestamp: timestamp,
            signature: signature,
            api_key: process.env.CLOUDINARY_API_KEY,
          });
          console.log(`🗑️ Deleted old image: ${setting.value.publicId}`);
        } catch (deleteError) {
          console.error("❌ Failed to delete old image:", deleteError.message);
        }
      }

      setting.value = imageData;
      setting.type = "image";
    } else {
      setting = new Setting({
        key,
        value: imageData,
        type: "image",
        group: "collection",
        description: `Collection page image: ${key}`,
        isPublic: true,
      });
    }

    await setting.save();

    console.log(`✅ Image uploaded for setting: ${key}`);

    res.status(200).json({
      success: true,
      data: { setting },
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("❌ Upload setting image error:", error);
    next(error);
  }
};

/**
 * Bulk update settings (Admin)
 */
exports.bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      throw new AppError("Settings array is required", 400, "INVALID_DATA");
    }

    const results = [];
    for (const item of settings) {
      const { key, value, type, group, description, isPublic } = item;

      if (!key) continue;

      let setting = await Setting.findOne({ key });

      if (setting) {
        setting.value = value !== undefined ? value : setting.value;
        setting.type = type || setting.type;
        setting.group = group || setting.group;
        setting.description = description || setting.description;
        if (isPublic !== undefined) setting.isPublic = isPublic;
      } else {
        setting = new Setting({
          key,
          value,
          type: type || "string",
          group: group || "general",
          description: description || "",
          isPublic: isPublic !== undefined ? isPublic : true,
        });
      }

      await setting.save();
      results.push({ key, success: true });
    }

    res.status(200).json({
      success: true,
      data: { results },
      message: "Settings updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete setting (Admin)
 */
exports.deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOneAndDelete({ key });

    if (!setting) {
      throw new AppError("Setting not found", 404, "SETTING_NOT_FOUND");
    }

    // Delete image from Cloudinary if it's an image type
    if (setting.type === "image" && setting.value?.publicId) {
      try {
        const axios = require("axios");
        const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
        const timestamp = Math.floor(Date.now() / 1000);
        const crypto = require("crypto");
        const signature = crypto
          .createHash("sha256")
          .update(
            `public_id=${setting.value.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
          )
          .digest("hex");

        await axios.post(deleteUrl, {
          public_id: setting.value.publicId,
          timestamp: timestamp,
          signature: signature,
          api_key: process.env.CLOUDINARY_API_KEY,
        });
        console.log(`🗑️ Deleted image: ${setting.value.publicId}`);
      } catch (deleteError) {
        console.error("❌ Failed to delete image:", deleteError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: "Setting deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initialize default category settings
 */
exports.initCategorySettings = async (req, res, next) => {
  try {
    console.log("🔄 Initializing category settings...");

    const defaultSettings = [
      {
        key: "category_section_title",
        value: "Explore Our Collections",
        type: "string",
        group: "category",
        description: "Main title for category section",
        isPublic: true,
      },
      {
        key: "category_section_subtitle",
        value: "Discover the perfect fragrance for every moment",
        type: "string",
        group: "category",
        description: "Subtitle for category section",
        isPublic: true,
      },
      {
        key: "category_badge_text",
        value: "Collection",
        type: "string",
        group: "category",
        description: "Badge text shown on category cards",
        isPublic: true,
      },
      {
        key: "category_shop_now_text",
        value: "Shop Now",
        type: "string",
        group: "category",
        description: "Shop now button text",
        isPublic: true,
      },
      {
        key: "category_section_enabled",
        value: true,
        type: "boolean",
        group: "category",
        description: "Enable/disable category section",
        isPublic: true,
      },
    ];

    for (const settingData of defaultSettings) {
      const existing = await Setting.findOne({ key: settingData.key });
      if (existing) {
        console.log(`📝 Updating existing setting: ${settingData.key}`);
        existing.value = settingData.value;
        existing.isPublic = true;
        await existing.save();
      } else {
        console.log(`✅ Creating new setting: ${settingData.key}`);
        await Setting.create(settingData);
      }
    }

    const count = await Setting.countDocuments({ group: "category" });
    console.log(`📊 Total category settings: ${count}`);

    res.status(200).json({
      success: true,
      message: "Category settings initialized successfully",
    });
  } catch (error) {
    console.error("❌ Init category settings error:", error);
    next(error);
  }
};

/**
 * Initialize default collection settings
 */
exports.initCollectionSettings = async (req, res, next) => {
  try {
    console.log("🔄 Initializing collection settings...");

    const defaultSettings = [
      {
        key: "collection_page_title",
        value: "All Collections",
        type: "string",
        group: "collection",
        description: "Main title for collections page",
        isPublic: true,
      },
      {
        key: "collection_page_subtitle",
        value: "Discover the perfect fragrance for every moment",
        type: "string",
        group: "collection",
        description: "Subtitle for collections page",
        isPublic: true,
      },
      {
        key: "collection_hero_image",
        value: {
          url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&h=400&fit=crop",
          publicId: "default/collection-hero",
        },
        type: "image",
        group: "collection",
        description: "Hero background image for collections page",
        isPublic: true,
      },
      {
        key: "collection_section_enabled",
        value: true,
        type: "boolean",
        group: "collection",
        description: "Enable/disable collections page",
        isPublic: true,
      },
    ];

    for (const settingData of defaultSettings) {
      const existing = await Setting.findOne({ key: settingData.key });
      if (existing) {
        console.log(`📝 Updating existing setting: ${settingData.key}`);
        // Only update value if it's not an image or if image doesn't have publicId
        if (settingData.type !== "image" || !existing.value?.publicId) {
          existing.value = settingData.value;
        }
        existing.isPublic = true;
        await existing.save();
      } else {
        console.log(`✅ Creating new setting: ${settingData.key}`);
        await Setting.create(settingData);
      }
    }

    const count = await Setting.countDocuments({ group: "collection" });
    console.log(`📊 Total collection settings: ${count}`);

    res.status(200).json({
      success: true,
      message: "Collection settings initialized successfully",
    });
  } catch (error) {
    console.error("❌ Init collection settings error:", error);
    next(error);
  }
};

/**
 * Initialize default shop settings
 */
exports.initShopSettings = async (req, res, next) => {
  try {
    console.log("🔄 Initializing shop settings...");

    const defaultSettings = [
      {
        key: "shop_page_title",
        value: "Shop Fragrances",
        type: "string",
        group: "shop",
        description: "Main title for shop page",
        isPublic: true,
      },
      {
        key: "shop_page_subtitle",
        value: "Discover your perfect scent",
        type: "string",
        group: "shop",
        description: "Subtitle for shop page",
        isPublic: true,
      },
      {
        key: "shop_search_placeholder",
        value: "Search for perfumes...",
        type: "string",
        group: "shop",
        description: "Search input placeholder text",
        isPublic: true,
      },
      {
        key: "shop_hero_image",
        value: {
          url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1920&h=400&fit=crop",
          publicId: "default/shop-hero",
        },
        type: "image",
        group: "shop",
        description: "Hero background image for shop page",
        isPublic: true,
      },
      {
        key: "shop_page_enabled",
        value: true,
        type: "boolean",
        group: "shop",
        description: "Enable/disable shop page",
        isPublic: true,
      },
    ];

    for (const settingData of defaultSettings) {
      const existing = await Setting.findOne({ key: settingData.key });
      if (existing) {
        console.log(`📝 Updating existing setting: ${settingData.key}`);
        if (settingData.type !== "image" || !existing.value?.publicId) {
          existing.value = settingData.value;
        }
        existing.isPublic = true;
        await existing.save();
      } else {
        console.log(`✅ Creating new setting: ${settingData.key}`);
        await Setting.create(settingData);
      }
    }

    const count = await Setting.countDocuments({ group: "shop" });
    console.log(`📊 Total shop settings: ${count}`);

    res.status(200).json({
      success: true,
      message: "Shop settings initialized successfully",
    });
  } catch (error) {
    console.error("❌ Init shop settings error:", error);
    next(error);
  }
};

// ABOUT SETTING FUNCTION

/**
 * Initialize default about page settings
 */
exports.initAboutSettings = async (req, res, next) => {
  try {
    console.log("🔄 Initializing about page settings...");

    const defaultSettings = [
      // Hero Section
      {
        key: "about_hero_badge",
        value: "✦ About Elegance",
        type: "string",
        group: "about",
        description: "Hero badge text",
        isPublic: true,
      },
      {
        key: "about_hero_title",
        value: "Crafting Luxury Fragrances Since 2015",
        type: "string",
        group: "about",
        description: "Hero main title",
        isPublic: true,
      },
      {
        key: "about_hero_subtitle",
        value:
          "We believe that luxury is an experience, not just a product. Every fragrance we create is a masterpiece of artistry, quality, and passion.",
        type: "string",
        group: "about",
        description: "Hero subtitle/description",
        isPublic: true,
      },
      {
        key: "about_hero_btn_primary_text",
        value: "Explore Collection",
        type: "string",
        group: "about",
        description: "Hero primary button text",
        isPublic: true,
      },
      {
        key: "about_hero_btn_primary_link",
        value: "/shop",
        type: "string",
        group: "about",
        description: "Hero primary button link",
        isPublic: true,
      },
      {
        key: "about_hero_btn_secondary_text",
        value: "Our Story",
        type: "string",
        group: "about",
        description: "Hero secondary button text",
        isPublic: true,
      },
      {
        key: "about_hero_btn_secondary_link",
        value: "/collections",
        type: "string",
        group: "about",
        description: "Hero secondary button link",
        isPublic: true,
      },

      // Story Section
      {
        key: "about_story_tag",
        value: "Our Story",
        type: "string",
        group: "about",
        description: "Story section tag",
        isPublic: true,
      },
      {
        key: "about_story_title",
        value: "The Art of Perfumery",
        type: "string",
        group: "about",
        description: "Story section title",
        isPublic: true,
      },
      {
        key: "about_story_text_1",
        value:
          "Elegance Perfumes was born from a simple yet profound belief: fragrance is the invisible luxury that defines who you are. What started as a passion project in a small studio has grown into Pakistan's premier destination for luxury fragrances.",
        type: "string",
        group: "about",
        description: "Story paragraph 1",
        isPublic: true,
      },
      {
        key: "about_story_text_2",
        value:
          "We travel the world to source the rarest and most exquisite ingredients—from the lush fields of Grasse to the exotic markets of Dubai. Our master perfumers blend these precious materials with artistry and precision to create scents that are truly unforgettable.",
        type: "string",
        group: "about",
        description: "Story paragraph 2",
        isPublic: true,
      },
      {
        key: "about_story_features",
        value: [
          "Premium Quality",
          "Sustainable Sourcing",
          "Artisan Craftsmanship",
          "Luxury Experience",
        ],
        type: "array",
        group: "about",
        description: "Story feature items",
        isPublic: true,
      },

      // Values Section
      {
        key: "about_values_tag",
        value: "Our Values",
        type: "string",
        group: "about",
        description: "Values section tag",
        isPublic: true,
      },
      {
        key: "about_values_title",
        value: "What Drives Us",
        type: "string",
        group: "about",
        description: "Values section title",
        isPublic: true,
      },
      {
        key: "about_values_subtitle",
        value:
          "Our core values guide everything we do, from sourcing to serving you.",
        type: "string",
        group: "about",
        description: "Values section subtitle",
        isPublic: true,
      },
      {
        key: "about_values_items",
        value: [
          {
            title: "Luxury Quality",
            description:
              "We source only the finest ingredients from around the world to create unforgettable fragrances.",
          },
          {
            title: "Sustainable Luxury",
            description:
              "Committed to ethical sourcing, sustainable practices, and eco-friendly packaging.",
          },
          {
            title: "Passion for Perfumery",
            description:
              "Every fragrance tells a story. We pour our passion into crafting scents that evoke emotions.",
          },
          {
            title: "Innovation & Excellence",
            description:
              "Constantly exploring new olfactory experiences to bring you the extraordinary.",
          },
        ],
        type: "array",
        group: "about",
        description: "Values items with title and description",
        isPublic: true,
      },

      // Testimonial Section
      {
        key: "about_testimonial_text",
        value:
          "Elegance Perfumes has completely transformed my understanding of luxury fragrances. Every scent tells a story and the quality is unmatched. It's not just perfume; it's an experience.",
        type: "string",
        group: "about",
        description: "Testimonial text",
        isPublic: true,
      },
      {
        key: "about_testimonial_author_name",
        value: "Zara Malik",
        type: "string",
        group: "about",
        description: "Testimonial author name",
        isPublic: true,
      },
      {
        key: "about_testimonial_author_title",
        value: "Luxury Beauty Influencer • 500K+ Followers",
        type: "string",
        group: "about",
        description: "Testimonial author title",
        isPublic: true,
      },
      {
        key: "about_testimonial_rating",
        value: 5,
        type: "number",
        group: "about",
        description: "Testimonial rating (1-5)",
        isPublic: true,
      },

      // Stats Section
      {
        key: "about_stats",
        value: [
          {
            value: "50K+",
            label: "Happy Customers",
            description: "Trusted by fragrance lovers worldwide",
          },
          {
            value: "10K+",
            label: "Orders Delivered",
            description: "Successfully fulfilled with care",
          },
          {
            value: "4.9",
            label: "Average Rating",
            description: "Based on thousands of reviews",
          },
          {
            value: "100+",
            label: "Premium Brands",
            description: "Curated luxury collections",
          },
        ],
        type: "array",
        group: "about",
        description: "Statistics items",
        isPublic: true,
      },

      // CTA Section
      {
        key: "about_cta_badge",
        value: "✦ Experience Luxury",
        type: "string",
        group: "about",
        description: "CTA badge text",
        isPublic: true,
      },
      {
        key: "about_cta_title",
        value: "Find Your Signature Scent",
        type: "string",
        group: "about",
        description: "CTA title",
        isPublic: true,
      },
      {
        key: "about_cta_subtitle",
        value:
          "Discover our curated collection of luxury fragrances and find the scent that defines you.",
        type: "string",
        group: "about",
        description: "CTA subtitle",
        isPublic: true,
      },
      {
        key: "about_cta_btn_primary_text",
        value: "Shop Now",
        type: "string",
        group: "about",
        description: "CTA primary button text",
        isPublic: true,
      },
      {
        key: "about_cta_btn_primary_link",
        value: "/shop",
        type: "string",
        group: "about",
        description: "CTA primary button link",
        isPublic: true,
      },
      {
        key: "about_cta_btn_secondary_text",
        value: "Explore Collections",
        type: "string",
        group: "about",
        description: "CTA secondary button text",
        isPublic: true,
      },
      {
        key: "about_cta_btn_secondary_link",
        value: "/collections",
        type: "string",
        group: "about",
        description: "CTA secondary button link",
        isPublic: true,
      },

      // Contact Info
      {
        key: "about_contact_info",
        value: [
          {
            icon: "MapPin",
            title: "Visit Us",
            details: ["Luxury Fragrance House", "Islamabad, Pakistan"],
          },
          {
            icon: "Mail",
            title: "Email Us",
            details: ["elegance.myperfume@gmail.com", "info@elegance.pk"],
          },
          {
            icon: "Phone",
            title: "Call Us",
            details: ["+923199457143", "Mon-Sat, 9AM - 9PM"],
          },
        ],
        type: "array",
        group: "about",
        description: "Contact information items",
        isPublic: true,
      },

      // Page Enable
      {
        key: "about_page_enabled",
        value: true,
        type: "boolean",
        group: "about",
        description: "Enable/disable about page",
        isPublic: true,
      },
    ];

    for (const settingData of defaultSettings) {
      const existing = await Setting.findOne({ key: settingData.key });
      if (existing) {
        console.log(`📝 Updating existing setting: ${settingData.key}`);
        existing.value = settingData.value;
        existing.isPublic = true;
        await existing.save();
      } else {
        console.log(`✅ Creating new setting: ${settingData.key}`);
        await Setting.create(settingData);
      }
    }

    const count = await Setting.countDocuments({ group: "about" });
    console.log(`📊 Total about settings: ${count}`);

    res.status(200).json({
      success: true,
      message: "About page settings initialized successfully",
    });
  } catch (error) {
    console.error("❌ Init about settings error:", error);
    next(error);
  }
};
