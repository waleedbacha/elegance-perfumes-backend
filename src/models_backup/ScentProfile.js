/**
 * ScentProfile Model
 * User scent preferences and quiz results
 */

const mongoose = require("mongoose");

const scentProfileSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER REFERENCE
    // ==========================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // ==========================================
    // QUIZ RESPONSES
    // ==========================================
    quizResponses: [
      {
        question: {
          type: String,
          required: true,
        },
        questionId: {
          type: String,
        },
        answer: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
        options: [String],
        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================
    // SCENT PREFERENCES
    // ==========================================
    preferredNotes: {
      top: [
        {
          name: String,
          weight: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
      middle: [
        {
          name: String,
          weight: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
      base: [
        {
          name: String,
          weight: {
            type: Number,
            min: 0,
            max: 100,
          },
        },
      ],
    },

    // ==========================================
    // SCENT CATEGORIES
    // ==========================================
    scentCategories: {
      floral: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      woody: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      oriental: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      citrus: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      fresh: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      spicy: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      aquatic: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      gourmand: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },

    // ==========================================
    // PREFERENCES
    // ==========================================
    preferences: {
      intensity: {
        type: String,
        enum: ["soft", "moderate", "intense", "extreme"],
      },
      longevity: {
        type: String,
        enum: ["short", "medium", "long", "extreme"],
      },
      seasons: [
        {
          type: String,
          enum: ["spring", "summer", "fall", "winter"],
        },
      ],
      occasions: [
        {
          type: String,
          enum: ["everyday", "office", "party", "date", "wedding", "formal"],
        },
      ],
      budgetRange: {
        min: Number,
        max: Number,
      },
      preferredBrands: [String],
      preferredCategories: [String],
    },

    // ==========================================
    // RECOMMENDATIONS
    // ==========================================
    recommendations: {
      topPicks: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          score: {
            type: Number,
            min: 0,
            max: 100,
          },
          reason: String,
          matchedTags: [String],
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      similarToFavorites: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          similarity: {
            type: Number,
            min: 0,
            max: 100,
          },
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      seasonalPicks: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          season: String,
          recommendedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },

    // ==========================================
    // FAVORITE PRODUCTS
    // ==========================================
    favoriteProducts: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================
    // QUIZ METADATA
    // ==========================================
    quizCompleted: {
      type: Boolean,
      default: false,
    },
    quizCompletedAt: Date,
    quizScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    // ==========================================
    // LAST UPDATED
    // ==========================================
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ==========================================
// INDEXES FOR PERFORMANCE
// ==========================================
scentProfileSchema.index({ user: 1 }, { unique: true });
scentProfileSchema.index({ quizCompleted: 1 });
scentProfileSchema.index({ lastUpdated: -1 });

// Compound indexes for recommendations
scentProfileSchema.index({ "preferences.intensity": 1 });
scentProfileSchema.index({ "preferences.seasons": 1 });

// ==========================================
// VIRTUAL FIELDS
// ==========================================
scentProfileSchema.virtual("dominantCategory").get(function () {
  const categories = this.scentCategories;
  const maxValue = Math.max(
    categories.floral,
    categories.woody,
    categories.oriental,
    categories.citrus,
    categories.fresh,
    categories.spicy,
    categories.aquatic,
    categories.gourmand,
  );

  const dominant = [];
  if (categories.floral === maxValue) dominant.push("floral");
  if (categories.woody === maxValue) dominant.push("woody");
  if (categories.oriental === maxValue) dominant.push("oriental");
  if (categories.citrus === maxValue) dominant.push("citrus");
  if (categories.fresh === maxValue) dominant.push("fresh");
  if (categories.spicy === maxValue) dominant.push("spicy");
  if (categories.aquatic === maxValue) dominant.push("aquatic");
  if (categories.gourmand === maxValue) dominant.push("gourmand");

  return dominant;
});

scentProfileSchema.virtual("hasQuiz").get(function () {
  return this.quizCompleted && this.quizResponses.length > 0;
});

scentProfileSchema.virtual("recommendationCount").get(function () {
  return (
    this.recommendations.topPicks.length +
    this.recommendations.similarToFavorites.length +
    this.recommendations.seasonalPicks.length
  );
});

// ==========================================
// INSTANCE METHODS
// ==========================================

/**
 * Complete quiz and update profile
 */
scentProfileSchema.methods.completeQuiz = async function (responses) {
  this.quizResponses = responses.map((r) => ({
    question: r.question,
    questionId: r.questionId,
    answer: r.answer,
    options: r.options,
    answeredAt: new Date(),
  }));

  this.quizCompleted = true;
  this.quizCompletedAt = new Date();
  this.lastUpdated = new Date();

  // Calculate scent profile based on responses
  this._calculateScentProfile(responses);

  await this.save();
  return this;
};

/**
 * Calculate scent profile from quiz responses
 */
scentProfileSchema.methods._calculateScentProfile = function (responses) {
  // This is a simplified example - in practice, this would be more sophisticated
  const weights = {
    floral: 0,
    woody: 0,
    oriental: 0,
    citrus: 0,
    fresh: 0,
    spicy: 0,
    aquatic: 0,
    gourmand: 0,
  };

  // Process each response to update weights
  responses.forEach((response) => {
    // Map answers to scent categories
    // This is simplified - actual implementation would be more complex
    const answer = response.answer;
    if (typeof answer === "string") {
      // Map specific answers to categories
      const categoryMap = {
        rose: "floral",
        jasmine: "floral",
        lavender: "floral",
        sandalwood: "woody",
        oud: "woody",
        patchouli: "woody",
        vanilla: "gourmand",
        amber: "oriental",
        musk: "oriental",
        lemon: "citrus",
        orange: "citrus",
        bergamot: "citrus",
        mint: "fresh",
        sea: "aquatic",
        pepper: "spicy",
        cinnamon: "spicy",
        cardamom: "spicy",
      };

      Object.keys(categoryMap).forEach((key) => {
        if (answer.toLowerCase().includes(key)) {
          weights[categoryMap[key]] = (weights[categoryMap[key]] || 0) + 10;
        }
      });
    }
  });

  // Normalize weights
  const maxWeight = Math.max(...Object.values(weights), 1);
  Object.keys(weights).forEach((key) => {
    this.scentCategories[key] = Math.round((weights[key] / maxWeight) * 100);
  });

  // Update preferences based on responses
  responses.forEach((response) => {
    if (response.questionId === "intensity") {
      this.preferences.intensity = response.answer;
    }
    if (response.questionId === "longevity") {
      this.preferences.longevity = response.answer;
    }
    if (response.questionId === "seasons") {
      this.preferences.seasons = response.answer;
    }
    if (response.questionId === "occasions") {
      this.preferences.occasions = response.answer;
    }
  });
};

/**
 * Generate product recommendations
 */
scentProfileSchema.methods.generateRecommendations = async function (
  limit = 10,
) {
  const Product = mongoose.model("Product");

  // Get user's preferred scent categories
  const categories = this.dominantCategory;
  const preferredNotes = [
    ...(this.preferredNotes.top || []),
    ...(this.preferredNotes.middle || []),
    ...(this.preferredNotes.base || []),
  ].map((n) => n.name);

  // Build query based on preferences
  const query = {
    status: "active",
  };

  // Filter by category if preferences exist
  if (this.preferences.preferredCategories.length > 0) {
    query.category = { $in: this.preferences.preferredCategories };
  }

  // Filter by brand if preferences exist
  if (this.preferences.preferredBrands.length > 0) {
    query.brand = { $in: this.preferences.preferredBrands };
  }

  // Find products matching preferences
  const products = await Product.find(query).limit(limit * 2);

  // Score products based on profile
  const scoredProducts = products.map((product) => {
    let score = 50; // Base score

    // Match scent categories
    const productCategories = this._getProductCategories(product);
    categories.forEach((cat) => {
      if (productCategories.includes(cat)) {
        score += 10;
      }
    });

    // Match notes
    const productNotes = [
      ...(product.notes?.top || []),
      ...(product.notes?.middle || []),
      ...(product.notes?.base || []),
    ];
    preferredNotes.forEach((note) => {
      if (
        productNotes.some((n) => n.toLowerCase().includes(note.toLowerCase()))
      ) {
        score += 5;
      }
    });

    // Match intensity preference
    if (this.preferences.intensity === product.intensity) {
      score += 10;
    }

    // Match season preference
    if (this.preferences.seasons) {
      const hasSeasonMatch = this.preferences.seasons.some((season) =>
        product.season?.includes(season),
      );
      if (hasSeasonMatch) score += 5;
    }

    return {
      product,
      score: Math.min(score, 100),
    };
  });

  // Sort by score and limit
  const topPicks = scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      product: item.product._id,
      score: item.score,
      reason: this._generateRecommendationReason(item.product, item.score),
      matchedTags: this._getMatchedTags(item.product),
      recommendedAt: new Date(),
    }));

  // Update recommendations
  this.recommendations.topPicks = topPicks;
  this.lastUpdated = new Date();

  await this.save();
  return topPicks;
};

/**
 * Helper: Get product scent categories
 */
scentProfileSchema.methods._getProductCategories = function (product) {
  const categories = [];

  // Check notes to determine categories
  const allNotes = [
    ...(product.notes?.top || []),
    ...(product.notes?.middle || []),
    ...(product.notes?.base || []),
  ];

  const noteCategoryMap = {
    floral: ["rose", "jasmine", "lavender", "lily", "peony", "violet"],
    woody: ["sandalwood", "cedar", "oud", "patchouli", "vetiver"],
    oriental: ["amber", "musk", "benzoin", "vanilla", "incense"],
    citrus: ["lemon", "orange", "bergamot", "grapefruit", "lime"],
    fresh: ["mint", "green", "herbal", "tea", "bamboo"],
    spicy: ["pepper", "cinnamon", "cardamom", "ginger", "nutmeg"],
    aquatic: ["sea", "ocean", "marine", "water", "oceanic"],
    gourmand: ["vanilla", "chocolate", "coffee", "caramel", "honey"],
  };

  Object.keys(noteCategoryMap).forEach((category) => {
    const keywords = noteCategoryMap[category];
    if (
      allNotes.some((note) =>
        keywords.some((kw) => note.toLowerCase().includes(kw)),
      )
    ) {
      categories.push(category);
    }
  });

  return categories;
};

/**
 * Helper: Generate recommendation reason
 */
scentProfileSchema.methods._generateRecommendationReason = function (
  product,
  score,
) {
  const reasons = [];

  if (score > 80) {
    reasons.push("This matches your scent profile perfectly!");
  } else if (score > 60) {
    reasons.push("This perfume aligns well with your preferences.");
  }

  if (product.isFeatured) {
    reasons.push("This is a featured fragrance.");
  }

  if (product.isNew) {
    reasons.push("This is a new arrival.");
  }

  if (product.isOnSale) {
    reasons.push("This is currently on sale.");
  }

  return reasons.join(" ") || "We think you might like this fragrance.";
};

/**
 * Helper: Get matched tags
 */
scentProfileSchema.methods._getMatchedTags = function (product) {
  const matched = [];

  // Match categories
  const productCategories = this._getProductCategories(product);
  const userCategories = this.dominantCategory;
  userCategories.forEach((cat) => {
    if (productCategories.includes(cat)) {
      matched.push(cat);
    }
  });

  // Match notes
  const userNotes = [
    ...(this.preferredNotes.top || []),
    ...(this.preferredNotes.middle || []),
    ...(this.preferredNotes.base || []),
  ].map((n) => n.name);
  const productNotes = [
    ...(product.notes?.top || []),
    ...(product.notes?.middle || []),
    ...(product.notes?.base || []),
  ];
  userNotes.forEach((note) => {
    if (
      productNotes.some((n) => n.toLowerCase().includes(note.toLowerCase()))
    ) {
      matched.push(note);
    }
  });

  return matched;
};

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get or create scent profile for user
 */
scentProfileSchema.statics.getOrCreate = async function (userId) {
  let profile = await this.findOne({ user: userId });

  if (!profile) {
    profile = new this({ user: userId });
    await profile.save();
  }

  return profile;
};

/**
 * Get user preferences summary
 */
scentProfileSchema.statics.getPreferencesSummary = async function (userId) {
  const profile = await this.findOne({ user: userId });

  if (!profile) {
    return null;
  }

  return {
    dominantCategories: profile.dominantCategory,
    intensity: profile.preferences.intensity,
    seasons: profile.preferences.seasons,
    occasions: profile.preferences.occasions,
    preferredBrands: profile.preferences.preferredBrands,
    preferredCategories: profile.preferences.preferredCategories,
    quizCompleted: profile.quizCompleted,
    hasQuiz: profile.hasQuiz,
  };
};

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model("ScentProfile", scentProfileSchema);

