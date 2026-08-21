/**
 * Category Model
 * Dynamic category management for Men, Women, Unisex
 */

const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      enum: ["men", "women", "unisex"],
      lowercase: true,
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      //   required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ==========================================
    // IMAGES
    // ==========================================
    image: {
      url: {
        type: String,
        required: [true, "Image URL is required"],
      },
      publicId: {
        type: String,
        required: true,
      },
      alt: String,
    },

    // ==========================================
    // STYLING
    // ==========================================
    gradient: {
      type: String,
      default: "rgba(139, 0, 0, 0.85)",
    },
    hoverGradient: {
      type: String,
      default: "rgba(139, 0, 0, 0.95)",
    },

    // ==========================================
    // STATUS
    // ==========================================
    isActive: {
      type: Boolean,
      default: true,
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
    metaKeywords: [String],
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
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, order: 1 });

// ==========================================
// PRE-SAVE HOOKS
// ==========================================
categorySchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  }
  if (!this.displayName) {
    this.displayName = this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }

  // ✅ Also ensure name is lowercase
  if (this.name) {
    this.name = this.name.toLowerCase();
  }

  next();
});

// ==========================================
// VIRTUAL FIELDS
// ==========================================
categorySchema.virtual("link").get(function () {
  return `/collections?category=${this.name}`;
});

categorySchema.virtual("imageUrl").get(function () {
  return this.image?.url || null;
});

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get active categories
 */
categorySchema.statics.getActiveCategories = function () {
  return this.find({ isActive: true }).sort({ order: 1 });
};

/**
 * Get category by name
 */
categorySchema.statics.getByName = function (name) {
  return this.findOne({ name: name.toLowerCase(), isActive: true });
};

/**
 * Seed default categories if none exist
 */
categorySchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  const defaults = [
    {
      name: "men",
      displayName: "MEN",
      description: "Bold. Strong. Confident.",
      gradient: "rgba(139, 0, 0, 0.85)",
      hoverGradient: "rgba(139, 0, 0, 0.95)",
      order: 1,
      image: {
        url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&h=600&fit=crop",
        publicId: "default/men",
        alt: "Men's fragrances",
      },
    },
    {
      name: "women",
      displayName: "WOMEN",
      description: "Elegant. Timeless. Charming.",
      gradient: "rgba(128, 0, 32, 0.85)",
      hoverGradient: "rgba(128, 0, 32, 0.95)",
      order: 2,
      image: {
        url: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&h=600&fit=crop",
        publicId: "default/women",
        alt: "Women's fragrances",
      },
    },
    {
      name: "unisex",
      displayName: "UNISEX",
      description: "Unique. Modern. Memorable.",
      gradient: "rgba(100, 0, 50, 0.85)",
      hoverGradient: "rgba(100, 0, 50, 0.95)",
      order: 3,
      image: {
        url: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&h=600&fit=crop",
        publicId: "default/unisex",
        alt: "Unisex fragrances",
      },
    },
  ];

  await this.insertMany(defaults);
  console.log("✅ Default categories seeded");
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Category", categorySchema);
