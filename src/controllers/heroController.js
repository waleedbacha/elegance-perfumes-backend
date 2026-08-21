/**
 * Hero Controller
 * Hero section management
 */

const { AppError } = require("../middleware/errorHandler");
const Hero = require("../models/Hero");

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * Get active hero
 */
exports.getHero = async (req, res, next) => {
  try {
    const hero = await Hero.getActiveHero();

    if (!hero) {
      // Return default structure if no hero exists
      return res.status(200).json({
        success: true,
        data: {
          hero: {
            title: "The Night",
            subtitle: "Discover the Art of Scent",
            description: "Indulge in the richness of luxury fragrances...",
            buttonText: "Shop Collection",
            buttonLink: "/shop",
            secondaryButtonText: "Pre-Order Now",
            secondaryButtonLink: "/collections",
            features: [
              { icon: "✓", label: "Authentic", subLabel: "100% Original" },
              {
                icon: "✓",
                label: "Fast Delivery",
                subLabel: "Across Pakistan",
              },
              { icon: "✓", label: "Secure Payment", subLabel: "100% Safe" },
            ],
            backgroundImage: {
              url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1920&h=1080&fit=crop",
            },
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { hero },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get all heroes (Admin)
 */
exports.getAllHeroes = async (req, res, next) => {
  try {
    const heroes = await Hero.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: { heroes },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single hero (Admin)
 */
exports.getHeroById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hero = await Hero.findById(id);

    if (!hero) {
      throw new AppError("Hero not found", 404, "HERO_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { hero },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create hero (Admin)
 */
exports.createHero = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      description,
      buttonText,
      buttonLink,
      secondaryButtonText,
      secondaryButtonLink,
      features,
      isActive,
      isDefault,
      order,
    } = req.body;

    // Handle image upload
    let backgroundImage = null;
    if (req.file) {
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
      form.append("folder", "elegance-perfumes/hero");

      const response = await axios.post(cloudinaryUrl, form, {
        headers: { ...form.getHeaders() },
        timeout: 60000,
      });

      backgroundImage = {
        url: response.data.secure_url,
        publicId: response.data.public_id,
        alt: title || "Hero background",
      };
    } else {
      // Use default image
      backgroundImage = {
        url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1920&h=1080&fit=crop",
        publicId: "default/hero",
        alt: title || "Hero background",
      };
    }

    // Parse features if string
    let parsedFeatures = features;
    if (typeof features === "string") {
      try {
        parsedFeatures = JSON.parse(features);
      } catch (e) {
        parsedFeatures = [
          { icon: "✓", label: "Authentic", subLabel: "100% Original" },
          { icon: "✓", label: "Fast Delivery", subLabel: "Across Pakistan" },
          { icon: "✓", label: "Secure Payment", subLabel: "100% Safe" },
        ];
      }
    }

    // If this hero is set as default, unset others
    if (isDefault === true || isDefault === "true") {
      await Hero.updateMany({}, { isDefault: false });
    }

    const hero = new Hero({
      title,
      subtitle,
      description,
      buttonText: buttonText || "Shop Now",
      buttonLink: buttonLink || "/shop",
      secondaryButtonText: secondaryButtonText || "Learn More",
      secondaryButtonLink: secondaryButtonLink || "/collections",
      features: parsedFeatures,
      backgroundImage,
      isActive: isActive === true || isActive === "true",
      isDefault: isDefault === true || isDefault === "true",
      order: parseInt(order) || 0,
    });

    await hero.save();

    res.status(201).json({
      success: true,
      data: { hero },
      message: "Hero created successfully",
    });
  } catch (error) {
    console.error("❌ Create hero error:", error);
    next(error);
  }
};

/**
 * Update hero (Admin)
 */
exports.updateHero = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      buttonText,
      buttonLink,
      secondaryButtonText,
      secondaryButtonLink,
      features,
      isActive,
      isDefault,
      order,
    } = req.body;

    const hero = await Hero.findById(id);
    if (!hero) {
      throw new AppError("Hero not found", 404, "HERO_NOT_FOUND");
    }

    // Update fields
    if (title) hero.title = title;
    if (subtitle) hero.subtitle = subtitle;
    if (description) hero.description = description;
    if (buttonText) hero.buttonText = buttonText;
    if (buttonLink) hero.buttonLink = buttonLink;
    if (secondaryButtonText) hero.secondaryButtonText = secondaryButtonText;
    if (secondaryButtonLink) hero.secondaryButtonLink = secondaryButtonLink;
    if (order !== undefined) hero.order = parseInt(order);
    if (isActive !== undefined)
      hero.isActive = isActive === true || isActive === "true";

    // Handle features
    if (features) {
      if (typeof features === "string") {
        try {
          hero.features = JSON.parse(features);
        } catch (e) {
          // Keep existing
        }
      } else {
        hero.features = features;
      }
    }

    // Handle default
    if (isDefault === true || isDefault === "true") {
      await Hero.updateMany({ _id: { $ne: id } }, { isDefault: false });
      hero.isDefault = true;
    } else if (isDefault === false || isDefault === "false") {
      hero.isDefault = false;
    }

    // Handle image upload
    if (req.file) {
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
      form.append("folder", "elegance-perfumes/hero");

      const response = await axios.post(cloudinaryUrl, form, {
        headers: { ...form.getHeaders() },
        timeout: 60000,
      });

      // Delete old image if not default
      if (
        hero.backgroundImage?.publicId &&
        !hero.backgroundImage.publicId.startsWith("default/")
      ) {
        try {
          const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
          const crypto = require("crypto");
          const timestamp = Math.floor(Date.now() / 1000);
          const signature = crypto
            .createHash("sha256")
            .update(
              `public_id=${hero.backgroundImage.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
            )
            .digest("hex");

          await axios.post(deleteUrl, {
            public_id: hero.backgroundImage.publicId,
            timestamp: timestamp,
            signature: signature,
            api_key: process.env.CLOUDINARY_API_KEY,
          });
        } catch (deleteError) {
          console.error("❌ Failed to delete old image:", deleteError.message);
        }
      }

      hero.backgroundImage = {
        url: response.data.secure_url,
        publicId: response.data.public_id,
        alt: hero.title || "Hero background",
      };
    }

    await hero.save();

    res.status(200).json({
      success: true,
      data: { hero },
      message: "Hero updated successfully",
    });
  } catch (error) {
    console.error("❌ Update hero error:", error);
    next(error);
  }
};

/**
 * Delete hero (Admin)
 */
exports.deleteHero = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hero = await Hero.findById(id);
    if (!hero) {
      throw new AppError("Hero not found", 404, "HERO_NOT_FOUND");
    }

    // Delete image from Cloudinary
    if (
      hero.backgroundImage?.publicId &&
      !hero.backgroundImage.publicId.startsWith("default/")
    ) {
      try {
        const axios = require("axios");
        const crypto = require("crypto");
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
          .createHash("sha256")
          .update(
            `public_id=${hero.backgroundImage.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
          )
          .digest("hex");

        await axios.post(cloudinaryUrl, {
          public_id: hero.backgroundImage.publicId,
          timestamp: timestamp,
          signature: signature,
          api_key: process.env.CLOUDINARY_API_KEY,
        });
      } catch (deleteError) {
        console.error("❌ Failed to delete image:", deleteError.message);
      }
    }

    await hero.deleteOne();

    res.status(200).json({
      success: true,
      message: "Hero deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default hero (Admin)
 */
exports.seedHero = async (req, res, next) => {
  try {
    await Hero.seedDefault();

    const hero = await Hero.getActiveHero();

    res.status(200).json({
      success: true,
      data: { hero },
      message: "Default hero seeded successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle hero status (Admin)
 */
exports.toggleHeroStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const hero = await Hero.findById(id);
    if (!hero) {
      throw new AppError("Hero not found", 404, "HERO_NOT_FOUND");
    }

    hero.isActive = isActive === true || isActive === "true";
    await hero.save();

    res.status(200).json({
      success: true,
      data: { hero },
      message: `Hero ${hero.isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error) {
    next(error);
  }
};
