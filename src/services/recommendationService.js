/**
 * Recommendation Service
 * AI-powered product recommendations
 */

const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Wishlist = require("../models/Wishlist");
const ScentProfile = require("../models/ScentProfile");
const Analytics = require("../models/Analytics");
const logger = require("../middleware/logger");

class RecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 3600; // 1 hour
  }

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const cacheKey = `recommendations:${userId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Get user's scent profile
      const scentProfile = await ScentProfile.findOne({ user: userId });

      // Get user's purchase history
      const orders = await Order.find({ user: userId, status: "delivered" })
        .populate("items.product")
        .limit(20);

      // Get user's wishlist
      const wishlist = await Wishlist.findOne({ user: userId });
      const wishlistProductIds =
        wishlist?.items.map((item) => item.product) || [];

      // Get user's reviews
      const reviews = await Review.find({ user: userId })
        .populate("product")
        .limit(20);

      // Build recommendation strategies
      const strategies = [];

      // 1. Based on scent profile
      if (scentProfile && scentProfile.quizCompleted) {
        strategies.push(
          await this.getScentProfileBasedRecommendations(scentProfile, limit),
        );
      }

      // 2. Based on purchase history
      if (orders.length > 0) {
        strategies.push(
          await this.getPurchaseBasedRecommendations(orders, limit),
        );
      }

      // 3. Based on wishlist
      if (wishlistProductIds.length > 0) {
        strategies.push(
          await this.getWishlistBasedRecommendations(wishlistProductIds, limit),
        );
      }

      // 4. Based on reviews
      if (reviews.length > 0) {
        strategies.push(
          await this.getReviewBasedRecommendations(reviews, limit),
        );
      }

      // 5. Trending products (fallback)
      strategies.push(await this.getTrendingRecommendations(limit));

      // Combine and score recommendations
      const combined = this.combineRecommendations(strategies, limit);

      // Filter out products user already purchased
      const purchasedProductIds = orders.flatMap((order) =>
        order.items.map((item) => item.product._id.toString()),
      );

      const filtered = combined.filter(
        (product) =>
          !purchasedProductIds.includes(product._id.toString()) &&
          !wishlistProductIds.includes(product._id.toString()),
      );

      // Cache results
      this.setToCache(cacheKey, filtered, this.cacheTTL);

      return filtered;
    } catch (error) {
      logger.error("Personalized recommendations failed", {
        userId,
        error: error.message,
      });
      // Fallback to trending
      return this.getTrendingRecommendations(limit);
    }
  }

  /**
   * Get recommendations based on scent profile
   */
  async getScentProfileBasedRecommendations(scentProfile, limit) {
    try {
      const query = { status: "active" };

      // Match dominant scent categories
      const dominantCategories = scentProfile.dominantCategory || [];
      if (dominantCategories.length > 0) {
        // Find products with matching notes
        const noteMap = {
          floral: [
            "rose",
            "jasmine",
            "lavender",
            "lily",
            "peony",
            "violet",
            "orchid",
          ],
          woody: ["sandalwood", "cedar", "oud", "patchouli", "vetiver", "pine"],
          oriental: ["amber", "musk", "benzoin", "vanilla", "incense", "myrrh"],
          citrus: [
            "lemon",
            "orange",
            "bergamot",
            "grapefruit",
            "lime",
            "mandarin",
          ],
          fresh: ["mint", "green", "herbal", "tea", "bamboo", "cucumber"],
          spicy: [
            "pepper",
            "cinnamon",
            "cardamom",
            "ginger",
            "nutmeg",
            "clove",
          ],
          aquatic: ["sea", "ocean", "marine", "water", "ozone"],
          gourmand: [
            "vanilla",
            "chocolate",
            "coffee",
            "caramel",
            "honey",
            "almond",
          ],
        };

        const matchingNotes = [];
        dominantCategories.forEach((category) => {
          if (noteMap[category]) {
            matchingNotes.push(...noteMap[category]);
          }
        });

        if (matchingNotes.length > 0) {
          query.$or = [
            { "notes.top": { $in: matchingNotes } },
            { "notes.middle": { $in: matchingNotes } },
            { "notes.base": { $in: matchingNotes } },
          ];
        }
      }

      // Match intensity preference
      if (scentProfile.preferences?.intensity) {
        query.intensity = scentProfile.preferences.intensity;
      }

      // Match season preference
      if (scentProfile.preferences?.seasons?.length > 0) {
        query.season = { $in: scentProfile.preferences.seasons };
      }

      // Match occasion preference
      if (scentProfile.preferences?.occasions?.length > 0) {
        query.occasion = { $in: scentProfile.preferences.occasions };
      }

      // Match brand preference
      if (scentProfile.preferences?.preferredBrands?.length > 0) {
        query.brand = { $in: scentProfile.preferences.preferredBrands };
      }

      const products = await Product.find(query)
        .sort({ "ratings.average": -1, purchasedCount: -1 })
        .limit(limit * 2);

      return products.map((product) => ({
        product,
        score: this.calculateScentMatchScore(product, scentProfile),
        strategy: "scent-profile",
      }));
    } catch (error) {
      logger.error("Scent profile recommendations failed", {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get recommendations based on purchase history
   */
  async getPurchaseBasedRecommendations(orders, limit) {
    try {
      // Get all purchased product IDs
      const purchasedProducts = orders.flatMap((order) =>
        order.items.map((item) => item.product),
      );

      // Get unique brands and categories
      const brands = new Set();
      const categories = new Set();
      const productIds = [];

      purchasedProducts.forEach((product) => {
        if (product) {
          brands.add(product.brand);
          categories.add(product.category);
          productIds.push(product._id);
        }
      });

      // Find similar products
      const query = {
        status: "active",
        _id: { $nin: productIds },
        $or: [
          { brand: { $in: Array.from(brands) } },
          { category: { $in: Array.from(categories) } },
        ],
      };

      const products = await Product.find(query)
        .sort({ "ratings.average": -1, purchasedCount: -1 })
        .limit(limit * 2);

      return products.map((product) => ({
        product,
        score: 70 + Math.random() * 20, // Base score with slight variation
        strategy: "purchase-history",
      }));
    } catch (error) {
      logger.error("Purchase-based recommendations failed", {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get recommendations based on wishlist
   */
  async getWishlistBasedRecommendations(wishlistProductIds, limit) {
    try {
      if (wishlistProductIds.length === 0) return [];

      // Get wishlist products
      const wishlistProducts = await Product.find({
        _id: { $in: wishlistProductIds },
      });

      // Get brands and categories from wishlist
      const brands = new Set();
      const categories = new Set();

      wishlistProducts.forEach((product) => {
        brands.add(product.brand);
        categories.add(product.category);
      });

      // Find similar products
      const query = {
        status: "active",
        _id: { $nin: wishlistProductIds },
        $or: [
          { brand: { $in: Array.from(brands) } },
          { category: { $in: Array.from(categories) } },
        ],
      };

      const products = await Product.find(query)
        .sort({ "ratings.average": -1, wishlistCount: -1 })
        .limit(limit * 2);

      return products.map((product) => ({
        product,
        score: 65 + Math.random() * 25,
        strategy: "wishlist-based",
      }));
    } catch (error) {
      logger.error("Wishlist-based recommendations failed", {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get recommendations based on reviews
   */
  async getReviewBasedRecommendations(reviews, limit) {
    try {
      if (reviews.length === 0) return [];

      // Get products user reviewed positively
      const likedProducts = reviews
        .filter((r) => r.rating >= 4 && r.product)
        .map((r) => r.product);

      if (likedProducts.length === 0) return [];

      // Get brands and categories from liked products
      const brands = new Set();
      const categories = new Set();
      const productIds = [];

      likedProducts.forEach((product) => {
        if (product) {
          brands.add(product.brand);
          categories.add(product.category);
          productIds.push(product._id);
        }
      });

      // Find similar products
      const query = {
        status: "active",
        _id: { $nin: productIds },
        $or: [
          { brand: { $in: Array.from(brands) } },
          { category: { $in: Array.from(categories) } },
        ],
      };

      const products = await Product.find(query)
        .sort({ "ratings.average": -1 })
        .limit(limit * 2);

      return products.map((product) => ({
        product,
        score: 60 + Math.random() * 30,
        strategy: "review-based",
      }));
    } catch (error) {
      logger.error("Review-based recommendations failed", {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get trending recommendations
   */
  async getTrendingRecommendations(limit) {
    try {
      const products = await Product.find({ status: "active" })
        .sort({ purchasedCount: -1, "ratings.average": -1 })
        .limit(limit);

      return products.map((product) => ({
        product,
        score: 50 + Math.random() * 20,
        strategy: "trending",
      }));
    } catch (error) {
      logger.error("Trending recommendations failed", {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Calculate scent match score
   */
  calculateScentMatchScore(product, scentProfile) {
    let score = 0;

    // Match notes
    const userNotes = [
      ...(scentProfile.preferredNotes?.top || []).map((n) => n.name),
      ...(scentProfile.preferredNotes?.middle || []).map((n) => n.name),
      ...(scentProfile.preferredNotes?.base || []).map((n) => n.name),
    ];

    const productNotes = [
      ...(product.notes?.top || []),
      ...(product.notes?.middle || []),
      ...(product.notes?.base || []),
    ];

    let noteMatches = 0;
    userNotes.forEach((note) => {
      if (
        productNotes.some((pn) => pn.toLowerCase().includes(note.toLowerCase()))
      ) {
        noteMatches++;
      }
    });

    score += (noteMatches / Math.max(userNotes.length, 1)) * 30;

    // Match intensity
    if (product.intensity === scentProfile.preferences?.intensity) {
      score += 15;
    }

    // Match season
    if (scentProfile.preferences?.seasons?.length > 0) {
      const seasonMatch = product.season?.some((s) =>
        scentProfile.preferences.seasons.includes(s),
      );
      if (seasonMatch) score += 10;
    }

    // Match occasion
    if (scentProfile.preferences?.occasions?.length > 0) {
      const occasionMatch = product.occasion?.some((o) =>
        scentProfile.preferences.occasions.includes(o),
      );
      if (occasionMatch) score += 10;
    }

    // Match brand
    if (scentProfile.preferences?.preferredBrands?.includes(product.brand)) {
      score += 15;
    }

    // Match category
    if (
      scentProfile.preferences?.preferredCategories?.includes(product.category)
    ) {
      score += 10;
    }

    // Rating bonus
    score += (product.ratings.average / 5) * 10;

    return Math.min(score, 100);
  }

  /**
   * Combine recommendations from multiple strategies
   */
  combineRecommendations(strategies, limit) {
    const allProducts = [];

    // Flatten all recommendations
    strategies.forEach((strategy) => {
      strategy.forEach((item) => {
        allProducts.push(item);
      });
    });

    // Group by product ID and average scores
    const productMap = new Map();

    allProducts.forEach((item) => {
      const productId = item.product._id.toString();
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product: item.product,
          scores: [],
          strategies: [],
        });
      }
      const entry = productMap.get(productId);
      entry.scores.push(item.score);
      entry.strategies.push(item.strategy);
    });

    // Calculate final score and sort
    const finalProducts = Array.from(productMap.values()).map((entry) => {
      const averageScore =
        entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
      const boost = Math.min(entry.strategies.length * 5, 20); // Boost for multiple strategies
      return {
        product: entry.product,
        score: Math.min(averageScore + boost, 100),
        strategies: [...new Set(entry.strategies)],
      };
    });

    // Sort by score
    finalProducts.sort((a, b) => b.score - a.score);

    return finalProducts.slice(0, limit).map((item) => item.product);
  }

  /**
   * Get similar products
   */
  async getSimilarProducts(productId, limit = 6) {
    try {
      const product = await Product.findById(productId);
      if (!product) return [];

      // Find products with similar notes, brand, category
      const query = {
        status: "active",
        _id: { $ne: productId },
        $or: [{ brand: product.brand }, { category: product.category }],
      };

      // Add note matching
      const allNotes = [
        ...(product.notes?.top || []),
        ...(product.notes?.middle || []),
        ...(product.notes?.base || []),
      ];

      if (allNotes.length > 0) {
        query.$or.push({
          $or: [
            { "notes.top": { $in: allNotes.slice(0, 3) } },
            { "notes.middle": { $in: allNotes.slice(0, 3) } },
            { "notes.base": { $in: allNotes.slice(0, 3) } },
          ],
        });
      }

      const similarProducts = await Product.find(query)
        .sort({ "ratings.average": -1, purchasedCount: -1 })
        .limit(limit);

      // Calculate similarity scores
      const scored = similarProducts.map((p) => ({
        product: p,
        similarity: this.calculateSimilarity(product, p),
      }));

      scored.sort((a, b) => b.similarity - a.similarity);

      return scored.slice(0, limit).map((item) => item.product);
    } catch (error) {
      logger.error("Similar products failed", {
        productId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Calculate product similarity
   */
  calculateSimilarity(productA, productB) {
    let score = 0;

    // Brand match
    if (productA.brand === productB.brand) score += 20;

    // Category match
    if (productA.category === productB.category) score += 15;

    // Note overlap
    const notesA = new Set([
      ...(productA.notes?.top || []),
      ...(productA.notes?.middle || []),
      ...(productA.notes?.base || []),
    ]);
    const notesB = new Set([
      ...(productB.notes?.top || []),
      ...(productB.notes?.middle || []),
      ...(productB.notes?.base || []),
    ]);

    let overlap = 0;
    notesA.forEach((note) => {
      if (notesB.has(note)) overlap++;
    });

    const total = Math.max(notesA.size, notesB.size, 1);
    score += (overlap / total) * 30;

    // Intensity match
    if (productA.intensity === productB.intensity) score += 10;

    // Price similarity (within 50% range)
    const priceRatio =
      Math.min(productA.price, productB.price) /
      Math.max(productA.price, productB.price);
    if (priceRatio > 0.5) {
      score += priceRatio * 15;
    }

    // Rating similarity
    const ratingDiff = Math.abs(
      productA.ratings.average - productB.ratings.average,
    );
    if (ratingDiff <= 0.5) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Get frequently bought together
   */
  async getFrequentlyBoughtTogether(productId, limit = 4) {
    try {
      // Find orders containing this product
      const orders = await Order.find({
        "items.product": productId,
        status: "delivered",
      })
        .populate("items.product")
        .limit(50);

      // Count co-occurrences
      const coOccurrence = new Map();

      orders.forEach((order) => {
        order.items.forEach((item) => {
          const id = item.product._id.toString();
          if (id !== productId) {
            coOccurrence.set(id, (coOccurrence.get(id) || 0) + 1);
          }
        });
      });

      // Sort by frequency
      const sorted = Array.from(coOccurrence.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map((entry) => entry[0]);

      // Get product details
      const products = await Product.find({
        _id: { $in: sorted },
        status: "active",
      });

      return products;
    } catch (error) {
      logger.error("Frequently bought together failed", {
        productId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Cache helper methods
   */
  getFromCache(key) {
    if (this.cache.has(key)) {
      const { data, timestamp } = this.cache.get(key);
      if (Date.now() - timestamp < this.cacheTTL * 1000) {
        return data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  setToCache(key, data, ttl = 3600) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
module.exports = new RecommendationService();
