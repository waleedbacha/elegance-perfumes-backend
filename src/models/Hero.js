/**
 * Hero Model
 * Dynamic hero section management
 */

const mongoose = require("mongoose");

const heroSchema = new mongoose.Schema(
  {
    // ==========================================
    // CONTENT
    // ==========================================
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 500,
    },
    buttonText: {
      type: String,
      default: "Shop Now",
      trim: true,
    },
    buttonLink: {
      type: String,
      default: "/shop",
      trim: true,
    },
    secondaryButtonText: {
      type: String,
      default: "Learn More",
      trim: true,
    },
    secondaryButtonLink: {
      type: String,
      default: "/collections",
      trim: true,
    },

    // ==========================================
    // IMAGES
    // ==========================================
    backgroundImage: {
      url: {
        type: String,
        required: [true, "Background image is required"],
      },
      publicId: {
        type: String,
        required: true,
      },
      alt: String,
    },

    // ==========================================
    // FEATURES (Displayed below hero)
    // ==========================================
    features: [
      {
        icon: {
          type: String,
          default: "✓",
        },
        label: {
          type: String,
          required: true,
        },
        subLabel: {
          type: String,
          required: true,
        },
      },
    ],

    // ==========================================
    // STATUS
    // ==========================================
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // META
    // ==========================================
    metaTitle: String,
    metaDescription: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ==========================================
// INDEXES
// ==========================================
heroSchema.index({ isActive: 1, order: 1 });
heroSchema.index({ isDefault: 1 });

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get active hero
 */
heroSchema.statics.getActiveHero = function () {
  return this.findOne({ isActive: true }).sort({ order: 1 });
};

/**
 * Get default hero or first active
 */
heroSchema.statics.getDefaultHero = function () {
  return (
    this.findOne({ isDefault: true, isActive: true }) || this.getActiveHero()
  );
};

/**
 * Seed default hero
 */
heroSchema.statics.seedDefault = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  const defaultHero = new this({
    title: "The Night",
    subtitle: "Discover the Art of Scent",
    description:
      "Indulge in the richness of luxury fragrances, crafted for unforgettable impressions.",
    buttonText: "Shop Collection",
    buttonLink: "/shop",
    secondaryButtonText: "Pre-Order Now",
    secondaryButtonLink: "/collections",
    isActive: true,
    isDefault: true,
    order: 0,
    features: [
      {
        icon: "✓",
        label: "Authentic",
        subLabel: "100% Original",
      },
      {
        icon: "✓",
        label: "Fast Delivery",
        subLabel: "Across Pakistan",
      },
      {
        icon: "✓",
        label: "Secure Payment",
        subLabel: "100% Safe",
      },
    ],
    backgroundImage: {
      url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1920&h=1080&fit=crop",
      publicId: "default/hero",
      alt: "Luxury Fragrances",
    },
  });

  await defaultHero.save();
  console.log("✅ Default hero seeded");
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Hero", heroSchema);
