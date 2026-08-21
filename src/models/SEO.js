const mongoose = require("mongoose");

const seoSchema = new mongoose.Schema(
  {
    // ==========================================
    // GLOBAL SETTINGS
    // ==========================================
    global: {
      site_name: {
        type: String,
        default: "Elegance Perfumes",
      },
      site_description: {
        type: String,
        default: "Luxury fragrances for men and women in Pakistan",
      },
      site_keywords: {
        type: String,
        default: "perfume, luxury fragrance, premium scents",
      },
      default_og_image: {
        type: String,
        default: "/default-og-image.jpg",
      },
      twitter_handle: {
        type: String,
        default: "@eleganceperfumes",
      },
      google_analytics_id: {
        type: String,
        default: "",
      },
      google_tag_manager_id: {
        type: String,
        default: "",
      },
      facebook_pixel_id: {
        type: String,
        default: "",
      },
      google_verification: {
        type: String,
        default: "",
      },
      bing_verification: {
        type: String,
        default: "",
      },
      robots: {
        index: {
          type: Boolean,
          default: true,
        },
        follow: {
          type: Boolean,
          default: true,
        },
        advanced: {
          type: String,
          default: "noarchive, nosnippet",
        },
      },
    },

    // ==========================================
    // PAGE SETTINGS
    // ==========================================
    pages: {
      homepage: {
        title: {
          type: String,
          default: "Luxury Fragrances | Elegance Perfumes",
        },
        description: {
          type: String,
          default:
            "Discover premium fragrances at Elegance Perfumes. Shop authentic perfumes for men and women in Pakistan. Luxury scents, fast delivery.",
        },
        keywords: {
          type: String,
          default:
            "luxury perfumes, premium fragrances, perfume store Pakistan",
        },
        og_image: {
          type: String,
          default: "",
        },
        canonical: {
          type: String,
          default: "/",
        },
        no_index: {
          type: Boolean,
          default: false,
        },
        no_follow: {
          type: Boolean,
          default: false,
        },
      },
      shop: {
        title: {
          type: String,
          default: "Shop Luxury Fragrances | Elegance Perfumes",
        },
        description: {
          type: String,
          default:
            "Browse our curated collection of premium perfumes. Find your signature scent at Elegance Perfumes. Authentic luxury fragrances.",
        },
        keywords: {
          type: String,
          default: "buy perfume, fragrance shop, luxury fragrances online",
        },
        og_image: {
          type: String,
          default: "",
        },
        canonical: {
          type: String,
          default: "/shop",
        },
        no_index: {
          type: Boolean,
          default: false,
        },
        no_follow: {
          type: Boolean,
          default: false,
        },
      },
      collections: {
        title: {
          type: String,
          default: "Perfume Collections | Elegance Perfumes",
        },
        description: {
          type: String,
          default:
            "Explore our exclusive perfume collections. Find luxury fragrances for every occasion at Elegance Perfumes.",
        },
        keywords: {
          type: String,
          default: "perfume collections, luxury fragrance sets, curated scents",
        },
        og_image: {
          type: String,
          default: "",
        },
        canonical: {
          type: String,
          default: "/collections",
        },
        no_index: {
          type: Boolean,
          default: false,
        },
        no_follow: {
          type: Boolean,
          default: false,
        },
      },
      about: {
        title: {
          type: String,
          default: "About Us | Elegance Perfumes",
        },
        description: {
          type: String,
          default:
            "Learn about Elegance Perfumes - Pakistan's premier luxury fragrance destination. Discover our story and commitment to authentic scents.",
        },
        keywords: {
          type: String,
          default: "about perfume store, luxury fragrance brand, perfume story",
        },
        og_image: {
          type: String,
          default: "",
        },
        canonical: {
          type: String,
          default: "/about",
        },
        no_index: {
          type: Boolean,
          default: false,
        },
        no_follow: {
          type: Boolean,
          default: false,
        },
      },
      contact: {
        title: {
          type: String,
          default: "Contact Us | Elegance Perfumes",
        },
        description: {
          type: String,
          default:
            "Get in touch with Elegance Perfumes. Reach us via phone, email, WhatsApp, or visit our store in Islamabad.",
        },
        keywords: {
          type: String,
          default:
            "contact perfume store, fragrance support, Elegance Perfumes",
        },
        og_image: {
          type: String,
          default: "",
        },
        canonical: {
          type: String,
          default: "/contact",
        },
        no_index: {
          type: Boolean,
          default: false,
        },
        no_follow: {
          type: Boolean,
          default: false,
        },
      },
    },

    // ==========================================
    // PRODUCT SEO TEMPLATES
    // ==========================================
    product_templates: {
      title_template: {
        type: String,
        default: "{product_name} | {brand} | Elegance Perfumes",
      },
      description_template: {
        type: String,
        default:
          "Buy {product_name} by {brand} at Elegance Perfumes. {description} Premium quality. Fast delivery across Pakistan.",
      },
      keywords_template: {
        type: String,
        default:
          "{product_name}, {brand}, perfume, luxury fragrance, premium scent",
      },
      og_image_template: {
        type: String,
        default: "{product_image}",
      },
      use_product_image: {
        type: Boolean,
        default: true,
      },
      max_title_length: {
        type: Number,
        default: 60,
      },
      max_description_length: {
        type: Number,
        default: 160,
      },
    },

    // ==========================================
    // CATEGORY SEO TEMPLATES
    // ==========================================
    category_templates: {
      title_template: {
        type: String,
        default: "{category_name} Perfumes | Elegance Perfumes",
      },
      description_template: {
        type: String,
        default:
          "Explore our {category_name} perfume collection. Find premium luxury fragrances for {category_name} at Elegance Perfumes.",
      },
      keywords_template: {
        type: String,
        default:
          "{category_name} perfumes, {category_name} fragrances, luxury scents",
      },
    },

    // ==========================================
    // SITEMAP SETTINGS
    // ==========================================
    sitemap: {
      auto_generate: {
        type: Boolean,
        default: true,
      },
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "daily",
      },
      last_generated: {
        type: Date,
        default: null,
      },
      include_products: {
        type: Boolean,
        default: true,
      },
      include_categories: {
        type: Boolean,
        default: true,
      },
      include_collections: {
        type: Boolean,
        default: true,
      },
      include_blog: {
        type: Boolean,
        default: false,
      },
      priority_map: {
        homepage: {
          type: Number,
          default: 1.0,
          min: 0,
          max: 1,
        },
        shop: {
          type: Number,
          default: 0.9,
          min: 0,
          max: 1,
        },
        collections: {
          type: Number,
          default: 0.8,
          min: 0,
          max: 1,
        },
        product: {
          type: Number,
          default: 0.7,
          min: 0,
          max: 1,
        },
        category: {
          type: Number,
          default: 0.6,
          min: 0,
          max: 1,
        },
        about: {
          type: Number,
          default: 0.5,
          min: 0,
          max: 1,
        },
        contact: {
          type: Number,
          default: 0.5,
          min: 0,
          max: 1,
        },
      },
    },

    // ==========================================
    // SOCIAL MEDIA SETTINGS
    // ==========================================
    social: {
      facebook: {
        app_id: {
          type: String,
          default: "",
        },
        default_image: {
          type: String,
          default: "",
        },
        default_title: {
          type: String,
          default: "{site_name}",
        },
        default_description: {
          type: String,
          default: "{site_description}",
        },
      },
      twitter: {
        card_type: {
          type: String,
          enum: ["summary", "summary_large_image", "app", "player"],
          default: "summary_large_image",
        },
        default_image: {
          type: String,
          default: "",
        },
        default_title: {
          type: String,
          default: "{site_name}",
        },
        default_description: {
          type: String,
          default: "{site_description}",
        },
      },
      linkedin: {
        default_image: {
          type: String,
          default: "",
        },
        default_title: {
          type: String,
          default: "{site_name}",
        },
        default_description: {
          type: String,
          default: "{site_description}",
        },
      },
    },

    // ==========================================
    // CUSTOM PAGES
    // ==========================================
    custom_pages: [
      {
        route: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        keywords: {
          type: String,
          default: "",
        },
        og_image: {
          type: String,
          default: "",
        },
        canonical: {
          type: String,
          default: "",
        },
        no_index: {
          type: Boolean,
          default: false,
        },
        no_follow: {
          type: Boolean,
          default: false,
        },
        priority: {
          type: Number,
          default: 0.5,
          min: 0,
          max: 1,
        },
        changefreq: {
          type: String,
          enum: [
            "always",
            "hourly",
            "daily",
            "weekly",
            "monthly",
            "yearly",
            "never",
          ],
          default: "monthly",
        },
      },
    ],

    // ==========================================
    // AUDIT SETTINGS
    // ==========================================
    audit: {
      last_run: {
        type: Date,
        default: null,
      },
      results: {
        total_pages: {
          type: Number,
          default: 0,
        },
        pages_with_meta: {
          type: Number,
          default: 0,
        },
        pages_without_meta: {
          type: Number,
          default: 0,
        },
        images_with_alt: {
          type: Number,
          default: 0,
        },
        images_without_alt: {
          type: Number,
          default: 0,
        },
        broken_links: {
          type: Number,
          default: 0,
        },
        total_internal_links: {
          type: Number,
          default: 0,
        },
        score: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        issues: [
          {
            type: {
              type: String,
              enum: [
                "missing_meta",
                "missing_alt",
                "broken_link",
                "long_title",
                "long_description",
              ],
            },
            page: {
              type: String,
            },
            message: {
              type: String,
            },
            severity: {
              type: String,
              enum: ["low", "medium", "high"],
              default: "medium",
            },
          },
        ],
      },
    },

    // ==========================================
    // META TAGS
    // ==========================================
    additional_meta: [
      {
        name: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["meta", "link"],
          default: "meta",
        },
        is_active: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // ==========================================
    // VERSIONING
    // ==========================================
    version: {
      type: Number,
      default: 1,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    history: [
      {
        version: {
          type: Number,
          required: true,
        },
        updated_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changes: {
          type: mongoose.Schema.Types.Mixed,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes
seoSchema.index({ "custom_pages.route": 1 });

// Middleware to auto-increment version
seoSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.version += 1;
  }
  next();
});

// Static method to get SEO settings
seoSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model("SEO", seoSchema);
