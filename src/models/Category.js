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
      // enum: ["men", "women", "unisex"],
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
    // ✅ Add your new categories to seed
    // {
    //   name: "date-night",
    //   displayName: "DATE NIGHT",
    //   description: "Captivating. Romantic. Unforgettable.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 4,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486553/elegance-perfumes/products/b26aq2b3qvl6hjna0evy.jpg",
    //     publicId: "default/date-night",
    //     alt: "Date Night fragrances",
    //   },
    // },
    // {
    //   name: "office-wear",
    //   displayName: "OFFICE WEAR",
    //   description: "Professional. Polished. Powerful.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 5,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486353/elegance-perfumes/products/isekelztrbiic2hr65d2.jpg",
    //     publicId: "default/office-wear",
    //     alt: "Office Wear fragrances",
    //   },
    // },
    // {
    //   name: "wedding",
    //   displayName: "WEDDING",
    //   description: "Celebratory. Luxurious. Memorable.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 6,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486395/elegance-perfumes/products/gjwincwtlkm87gelz9vr.jpg",
    //     publicId: "default/wedding",
    //     alt: "Wedding fragrances",
    //   },
    // },
    // {
    //   name: "everyday-wear",
    //   displayName: "EVERYDAY WEAR",
    //   description: "Effortless. Versatile. Signature.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 7,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486318/elegance-perfumes/products/ov8ulaarz3xrmbetyjbh.jpg",
    //     publicId: "default/everyday-wear",
    //     alt: "Everyday Wear fragrances",
    //   },
    // },
    // {
    //   name: "evening",
    //   displayName: "EVENING",
    //   description: "Dramatic. Mysterious. Alluring.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 8,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787485975/elegance-perfumes/products/o4ccvrrzubpdkue0rnqg.jpg",
    //     publicId: "default/evening",
    //     alt: "Evening fragrances",
    //   },
    // },
    // {
    //   name: "summer",
    //   displayName: "SUMMER",
    //   description: "Fresh. Vibrant. Radiant.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 9,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486148/elegance-perfumes/products/xewco1su0xcng3aimaib.jpg",
    //     publicId: "default/summer",
    //     alt: "Summer fragrances",
    //   },
    // },
    // {
    //   name: "winter",
    //   displayName: "WINTER",
    //   description: "Warm. Cozy. Intimate.",
    //   gradient: "rgba(139, 0, 0, 0.85)",
    //   hoverGradient: "rgba(139, 0, 0, 0.95)",
    //   order: 10,
    //   image: {
    //     url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787485975/elegance-perfumes/products/o4ccvrrzubpdkue0rnqg.jpg",
    //     publicId: "default/winter",
    //     alt: "Winter fragrances",
    //   },
    // },
  ];

  await this.insertMany(defaults);
  console.log("✅ Default categories seeded");
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("Category", categorySchema);
