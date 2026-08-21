// backend/src/services/seoAnalyticsService.js
const SEO = require("../models/SEO");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Analytics = require("../models/Analytics");

class SEOAnalyticsService {
  // ============================================
  // GET SEO SCORE
  // ============================================
  static async getSeoScore() {
    const settings = await SEO.findOne();
    if (!settings) return { score: 0, color: "red", metrics: [] };

    const metrics = [];
    let totalScore = 0;
    let maxScore = 0;

    // 1. Meta Tags Score
    const pages = settings.pages || {};
    const pagesWithMeta = Object.values(pages).filter(
      (p) => p.title && p.description,
    ).length;
    const totalPages = Object.keys(pages).length || 1;
    const metaScore = (pagesWithMeta / totalPages) * 100;
    metrics.push({
      name: "Meta Tags",
      score: metaScore,
      max: 100,
      details: `${pagesWithMeta}/${totalPages} pages have meta tags`,
    });
    totalScore += metaScore;
    maxScore += 100;

    // 2. Site Indexing
    const products = await Product.countDocuments({ status: "active" });
    const indexScore = Math.min(100, (products / 10) * 100);
    metrics.push({
      name: "Content Indexing",
      score: indexScore,
      max: 100,
      details: `${products} active products`,
    });
    totalScore += indexScore;
    maxScore += 100;

    // 3. SEO Best Practices
    const hasOGImage = !!settings.global?.default_og_image;
    const hasAnalytics = !!settings.global?.google_analytics_id;
    const hasDescription = !!settings.global?.site_description;

    let bestPracticesScore = 0;
    if (hasOGImage) bestPracticesScore += 33;
    if (hasAnalytics) bestPracticesScore += 33;
    if (hasDescription) bestPracticesScore += 34;

    metrics.push({
      name: "Best Practices",
      score: bestPracticesScore,
      max: 100,
      details: `${hasOGImage ? "✅" : "❌"} OG Image | ${hasAnalytics ? "✅" : "❌"} Analytics | ${hasDescription ? "✅" : "❌"} Description`,
    });
    totalScore += bestPracticesScore;
    maxScore += 100;

    const overallScore = Math.round((totalScore / maxScore) * 100);

    let color = "red";
    if (overallScore >= 80) color = "green";
    else if (overallScore >= 50) color = "yellow";

    return {
      score: overallScore,
      color,
      metrics,
      lastUpdated: new Date(),
    };
  }

  // ============================================
  // GET KEYWORD RANKINGS (Simulated)
  // ============================================
  static async getKeywordRankings() {
    // In production, connect to Google Search Console API
    // This is simulated data for demonstration
    return {
      keywords: [
        {
          keyword: "luxury perfumes",
          position: 4,
          previousPosition: 6,
          searchVolume: 2400,
          difficulty: 65,
          trend: "up",
        },
        {
          keyword: "premium fragrances",
          position: 8,
          previousPosition: 12,
          searchVolume: 1200,
          difficulty: 52,
          trend: "up",
        },
        {
          keyword: "buy perfume online",
          position: 3,
          previousPosition: 2,
          searchVolume: 3600,
          difficulty: 70,
          trend: "down",
        },
        {
          keyword: "best perfume brands",
          position: 15,
          previousPosition: 18,
          searchVolume: 800,
          difficulty: 45,
          trend: "up",
        },
        {
          keyword: "luxury cologne",
          position: 22,
          previousPosition: 25,
          searchVolume: 600,
          difficulty: 38,
          trend: "up",
        },
      ],
      averagePosition: 10.4,
      topKeywords: 3,
      totalKeywords: 5,
    };
  }

  // ============================================
  // GET TRAFFIC ANALYTICS
  // ============================================
  static async getTrafficAnalytics() {
    // In production, connect to Google Analytics API
    // This is simulated data for demonstration
    return {
      traffic: {
        organic: 4567,
        direct: 2345,
        social: 1234,
        referral: 890,
        email: 456,
      },
      bounceRate: 32.4,
      avgSessionDuration: 184, // seconds
      conversions: 123,
      conversionRate: 2.7,
      trending: {
        organic: 8.5,
        direct: -2.1,
        social: 12.3,
        referral: 5.6,
        email: -1.2,
      },
      lastUpdated: new Date(),
    };
  }

  // ============================================
  // GET CTR (Click-Through Rate)
  // ============================================
  static async getCTR() {
    // In production, connect to Search Console API
    return {
      overallCTR: 4.2,
      impressions: 45678,
      clicks: 1918,
      topPages: [
        { page: "/", ctr: 6.8, impressions: 12450 },
        { page: "/shop", ctr: 5.2, impressions: 8900 },
        { page: "/collections", ctr: 4.1, impressions: 5600 },
        { page: "/product/1", ctr: 3.8, impressions: 3200 },
        { page: "/product/2", ctr: 2.9, impressions: 2800 },
      ],
      trend: "up",
    };
  }

  // ============================================
  // GET INDEXED PAGES
  // ============================================
  static async getIndexedPages() {
    // In production, connect to Search Console API
    const totalProducts = await Product.countDocuments({ status: "active" });
    const totalPages = {
      homepage: 1,
      shop: 1,
      collections: 1,
      about: 1,
      contact: 1,
      products: totalProducts,
      categories: 4, // men, women, unisex, niche
      total: totalProducts + 9,
    };

    return {
      indexed: Math.min(totalPages.total, 1234),
      total: totalPages.total + 200,
      coverage: Math.round((totalPages.total / (totalPages.total + 200)) * 100),
      lastUpdated: new Date(),
    };
  }

  // ============================================
  // GET COMPLETE DASHBOARD DATA
  // ============================================
  static async getDashboardData() {
    const [score, rankings, traffic, ctr, indexed] = await Promise.all([
      this.getSeoScore(),
      this.getKeywordRankings(),
      this.getTrafficAnalytics(),
      this.getCTR(),
      this.getIndexedPages(),
    ]);

    return {
      score,
      rankings,
      traffic,
      ctr,
      indexed,
      timestamp: new Date(),
    };
  }
}

module.exports = SEOAnalyticsService;
