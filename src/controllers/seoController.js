const SEO = require("../models/SEO");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { AppError } = require("../middleware/errorHandler");

// ============================================
// GET SEO SETTINGS
// ============================================
exports.getSeoSettings = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE GLOBAL SETTINGS
// ============================================
exports.updateGlobalSettings = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const { global } = req.body;

    settings.global = {
      ...settings.global,
      ...global,
    };
    settings.updated_by = req.user.id;

    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { global },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Global SEO settings updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE PAGE SETTINGS
// ============================================
exports.updatePageSettings = async (req, res, next) => {
  try {
    const { page } = req.params;
    const { data } = req.body;

    const validPages = ["homepage", "shop", "collections", "about", "contact"];

    if (!validPages.includes(page)) {
      throw new AppError("Invalid page name", 400, "INVALID_PAGE");
    }

    const settings = await SEO.getSettings();

    if (!settings.pages[page]) {
      settings.pages[page] = {};
    }

    settings.pages[page] = {
      ...settings.pages[page],
      ...data,
    };

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { page, data },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: `SEO settings for ${page} updated successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE PRODUCT SEO TEMPLATES
// ============================================
exports.updateProductTemplates = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const { product_templates } = req.body;

    settings.product_templates = {
      ...settings.product_templates,
      ...product_templates,
    };

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { product_templates },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Product SEO templates updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE CATEGORY SEO TEMPLATES
// ============================================
exports.updateCategoryTemplates = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const { category_templates } = req.body;

    settings.category_templates = {
      ...settings.category_templates,
      ...category_templates,
    };

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { category_templates },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Category SEO templates updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE SITEMAP SETTINGS
// ============================================
exports.updateSitemapSettings = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const { sitemap } = req.body;

    settings.sitemap = {
      ...settings.sitemap,
      ...sitemap,
    };

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { sitemap },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Sitemap settings updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GENERATE SITEMAP
// ============================================
exports.generateSitemap = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const baseUrl = process.env.SITE_URL || "https://eleganceperfumes.com";

    // Static pages
    const staticPages = [
      {
        url: "/",
        priority: settings.sitemap.priority_map.homepage,
        changefreq: "daily",
      },
      {
        url: "/shop",
        priority: settings.sitemap.priority_map.shop,
        changefreq: "daily",
      },
      {
        url: "/collections",
        priority: settings.sitemap.priority_map.collections,
        changefreq: "weekly",
      },
      {
        url: "/about",
        priority: settings.sitemap.priority_map.about,
        changefreq: "monthly",
      },
      {
        url: "/contact",
        priority: settings.sitemap.priority_map.contact,
        changefreq: "monthly",
      },
    ];

    // Get products
    let products = [];
    if (settings.sitemap.include_products) {
      products = await Product.find({ status: "active" })
        .select("_id updatedAt slug")
        .lean();
    }

    // Get categories
    let categories = [];
    if (settings.sitemap.include_categories) {
      categories = await Category.find().select("name updatedAt").lean();
    }

    // Build XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static pages
    staticPages.forEach((page) => {
      xml += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Add product pages
    products.forEach((product) => {
      xml += `
  <url>
    <loc>${baseUrl}/product/${product._id}</loc>
    <lastmod>${new Date(product.updatedAt).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${settings.sitemap.priority_map.product}</priority>
  </url>`;
    });

    // Add category pages
    categories.forEach((category) => {
      xml += `
  <url>
    <loc>${baseUrl}/collections?category=${category.name}</loc>
    <lastmod>${new Date(category.updatedAt).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${settings.sitemap.priority_map.category}</priority>
  </url>`;
    });

    // Add custom pages
    if (settings.custom_pages && settings.custom_pages.length > 0) {
      settings.custom_pages.forEach((page) => {
        if (!page.no_index) {
          xml += `
  <url>
    <loc>${baseUrl}${page.route}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${page.changefreq || "monthly"}</changefreq>
    <priority>${page.priority || 0.5}</priority>
  </url>`;
        }
      });
    }

    xml += `
</urlset>`;

    // Update last_generated
    settings.sitemap.last_generated = new Date();
    await settings.save();

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    next(error);
  }
};

// ============================================
// GENERATE ROBOTS.TXT
// ============================================
exports.generateRobots = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const baseUrl = process.env.SITE_URL || "https://eleganceperfumes.com";

    let robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /login
Disallow: /register
Disallow: /profile`;

    // Add crawl delay for performance
    robots += `
Crawl-delay: 2`;

    // Add sitemap
    robots += `
Sitemap: ${baseUrl}/sitemap.xml`;

    res.header("Content-Type", "text/plain");
    res.send(robots);
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE SOCIAL MEDIA SETTINGS
// ============================================
exports.updateSocialSettings = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const { social } = req.body;

    settings.social = {
      ...settings.social,
      ...social,
    };

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { social },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "Social media settings updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADD CUSTOM PAGE
// ============================================
exports.addCustomPage = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const {
      route,
      title,
      description,
      keywords,
      og_image,
      canonical,
      no_index,
      no_follow,
      priority,
      changefreq,
    } = req.body;

    // Check if route already exists
    const existing = settings.custom_pages.find((p) => p.route === route);
    if (existing) {
      throw new AppError("Route already exists", 400, "ROUTE_EXISTS");
    }

    settings.custom_pages.push({
      route,
      title,
      description,
      keywords: keywords || "",
      og_image: og_image || "",
      canonical: canonical || route,
      no_index: no_index || false,
      no_follow: no_follow || false,
      priority: priority || 0.5,
      changefreq: changefreq || "monthly",
    });

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { custom_page: { route, title } },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(201).json({
      success: true,
      data: settings,
      message: `Custom page SEO added for ${route}`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPDATE CUSTOM PAGE
// ============================================
exports.updateCustomPage = async (req, res, next) => {
  try {
    const { route } = req.params;
    const settings = await SEO.getSettings();

    const pageIndex = settings.custom_pages.findIndex((p) => p.route === route);
    if (pageIndex === -1) {
      throw new AppError("Page not found", 404, "PAGE_NOT_FOUND");
    }

    settings.custom_pages[pageIndex] = {
      ...settings.custom_pages[pageIndex],
      ...req.body,
    };

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { custom_page_update: route },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: `Custom page SEO updated for ${route}`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// DELETE CUSTOM PAGE
// ============================================
exports.deleteCustomPage = async (req, res, next) => {
  try {
    const { route } = req.params;
    const settings = await SEO.getSettings();

    settings.custom_pages = settings.custom_pages.filter(
      (p) => p.route !== route,
    );

    settings.updated_by = req.user.id;
    settings.history.push({
      version: settings.version + 1,
      updated_by: req.user.id,
      changes: { custom_page_deleted: route },
      timestamp: new Date(),
    });

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: `Custom page SEO deleted for ${route}`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// RUN SEO AUDIT
// ============================================
exports.runSeoAudit = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings();
    const baseUrl = process.env.SITE_URL || "https://eleganceperfumes.com";

    // Get all products
    const products = await Product.find().select("name description images");

    // Get all pages to audit
    const pages = [
      { route: "/", ...settings.pages.homepage },
      { route: "/shop", ...settings.pages.shop },
      { route: "/collections", ...settings.pages.collections },
      { route: "/about", ...settings.pages.about },
      { route: "/contact", ...settings.pages.contact },
      ...settings.custom_pages.map((p) => ({ route: p.route, ...p })),
    ];

    const issues = [];
    let pagesWithMeta = 0;
    let pagesWithoutMeta = 0;
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;

    // Audit each page
    pages.forEach((page) => {
      const hasTitle = page.title && page.title.length > 0;
      const hasDescription = page.description && page.description.length > 0;

      if (hasTitle && hasDescription) {
        pagesWithMeta++;
      } else {
        pagesWithoutMeta++;
        if (!hasTitle) {
          issues.push({
            type: "missing_meta",
            page: page.route,
            message: "Missing meta title",
            severity: "high",
          });
        }
        if (!hasDescription) {
          issues.push({
            type: "missing_meta",
            page: page.route,
            message: "Missing meta description",
            severity: "high",
          });
        }
      }

      // Check title length
      if (hasTitle && page.title.length > 60) {
        issues.push({
          type: "long_title",
          page: page.route,
          message: `Title is ${page.title.length} characters (recommended: 60 max)`,
          severity: "medium",
        });
      }

      // Check description length
      if (hasDescription && page.description.length > 160) {
        issues.push({
          type: "long_description",
          page: page.route,
          message: `Description is ${page.description.length} characters (recommended: 160 max)`,
          severity: "medium",
        });
      }
    });

    // Audit product images for alt text
    products.forEach((product) => {
      if (product.images && product.images.length > 0) {
        product.images.forEach((img) => {
          if (img.alt && img.alt.length > 0) {
            imagesWithAlt++;
          } else {
            imagesWithoutAlt++;
            issues.push({
              type: "missing_alt",
              page: `/product/${product._id}`,
              message: `Missing alt text for image of "${product.name}"`,
              severity: "medium",
            });
          }
        });
      }
    });

    // Calculate score
    const totalAudited = pages.length + products.length;
    const issuesCount = issues.length;
    const score = Math.max(0, 100 - (issuesCount / totalAudited) * 100);

    // Save audit results
    settings.audit.last_run = new Date();
    settings.audit.results = {
      total_pages: pages.length,
      pages_with_meta: pagesWithMeta,
      pages_without_meta: pagesWithoutMeta,
      images_with_alt: imagesWithAlt,
      images_without_alt: imagesWithoutAlt,
      broken_links: 0,
      total_internal_links: 0,
      score: Math.round(score),
      issues: issues,
    };

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings.audit,
      message: "SEO audit completed",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET PAGE SEO PREVIEW
// ============================================
exports.getSeoPreview = async (req, res, next) => {
  try {
    const { page, productId, category } = req.query;
    const settings = await SEO.getSettings();

    let seoData = {
      title: "",
      description: "",
      keywords: "",
      og_image: "",
      canonical: "",
    };

    if (page) {
      // Get page SEO
      const pageData = settings.pages[page];
      if (pageData) {
        seoData = {
          title: pageData.title || "",
          description: pageData.description || "",
          keywords: pageData.keywords || "",
          og_image: pageData.og_image || "",
          canonical: pageData.canonical || "",
        };
      }
    } else if (productId) {
      // Get product SEO using templates
      const product = await Product.findById(productId);
      if (product) {
        const template = settings.product_templates;
        seoData.title = template.title_template
          .replace(/{product_name}/g, product.name)
          .replace(/{brand}/g, product.brand)
          .replace(/{category}/g, product.category || "")
          .replace(/{site_name}/g, settings.global.site_name);

        seoData.description = template.description_template
          .replace(/{product_name}/g, product.name)
          .replace(/{brand}/g, product.brand)
          .replace(
            /{description}/g,
            product.description?.substring(0, 150) || "",
          )
          .replace(/{category}/g, product.category || "")
          .replace(/{site_name}/g, settings.global.site_name);

        seoData.keywords = template.keywords_template
          .replace(/{product_name}/g, product.name)
          .replace(/{brand}/g, product.brand)
          .replace(/{category}/g, product.category || "");

        seoData.og_image =
          template.og_image_template.replace(
            /{product_image}/g,
            product.images?.[0]?.url || "",
          ) || settings.global.default_og_image;

        seoData.canonical = `/product/${product._id}`;
      }
    } else if (category) {
      // Get category SEO using templates
      const template = settings.category_templates;
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

      seoData.title = template.title_template.replace(
        /{category_name}/g,
        categoryName,
      );
      seoData.description = template.description_template.replace(
        /{category_name}/g,
        categoryName,
      );
      seoData.keywords = template.keywords_template.replace(
        /{category_name}/g,
        categoryName,
      );
      seoData.canonical = `/collections?category=${category}`;
    }

    res.status(200).json({
      success: true,
      data: seoData,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// BULK UPDATE PRODUCT SEO
// ============================================
exports.bulkUpdateProductSeo = async (req, res, next) => {
  try {
    const { productIds, field, value } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new AppError("Product IDs are required", 400, "INVALID_PRODUCTS");
    }

    if (!field || !value) {
      throw new AppError("Field and value are required", 400, "INVALID_DATA");
    }

    const validFields = ["metaTitle", "metaDescription", "metaKeywords"];

    if (!validFields.includes(field)) {
      throw new AppError("Invalid field name", 400, "INVALID_FIELD");
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { [field]: value } },
    );

    res.status(200).json({
      success: true,
      data: {
        modified: result.modifiedCount,
        matched: result.matchedCount,
      },
      message: `${result.modifiedCount} products updated successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET SEO HISTORY
// ============================================
exports.getSeoHistory = async (req, res, next) => {
  try {
    const settings = await SEO.getSettings().populate(
      "history.updated_by",
      "name email",
    );

    res.status(200).json({
      success: true,
      data: settings.history || [],
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// RESET TO DEFAULTS
// ============================================
exports.resetToDefaults = async (req, res, next) => {
  try {
    await SEO.deleteMany({});
    const settings = new SEO();
    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: "SEO settings reset to defaults",
    });
  } catch (error) {
    next(error);
  }
};

// backend/src/controllers/seoController.js
// Add these functions at the end of the file

const SEOAnalyticsService = require("../services/seoAnalyticsService");

// ============================================
// GET SEO DASHBOARD DATA
// ============================================
exports.getSeoDashboard = async (req, res, next) => {
  try {
    const data = await SEOAnalyticsService.getDashboardData();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    next(error);
  }
};

// ============================================
// GET KEYWORD RANKINGS
// ============================================
exports.getKeywordRankings = async (req, res, next) => {
  try {
    const { keyword } = req.query;
    const rankings = await SEOAnalyticsService.getKeywordRankings();

    let data = rankings;
    if (keyword) {
      data = {
        ...rankings,
        keywords: rankings.keywords.filter((k) =>
          k.keyword.toLowerCase().includes(keyword.toLowerCase()),
        ),
      };
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET KEYWORD SUGGESTIONS (Keyword Research)
// ============================================
exports.getKeywordSuggestions = async (req, res, next) => {
  try {
    const { query } = req.query;

    // Simulated keyword suggestions
    // In production, connect to Google Keyword Planner API
    const suggestions = [
      {
        keyword: "luxury perfumes",
        searchVolume: 2400,
        difficulty: 65,
        competition: "high",
      },
      {
        keyword: "premium fragrances",
        searchVolume: 1200,
        difficulty: 52,
        competition: "medium",
      },
      {
        keyword: "best perfumes for men",
        searchVolume: 980,
        difficulty: 48,
        competition: "medium",
      },
      {
        keyword: "women's perfume luxury",
        searchVolume: 850,
        difficulty: 55,
        competition: "high",
      },
      {
        keyword: "authentic perfumes online",
        searchVolume: 720,
        difficulty: 40,
        competition: "low",
      },
      {
        keyword: "luxury fragrance brands",
        searchVolume: 650,
        difficulty: 58,
        competition: "high",
      },
      {
        keyword: "perfume gift sets",
        searchVolume: 580,
        difficulty: 35,
        competition: "medium",
      },
      {
        keyword: "best perfume for women",
        searchVolume: 520,
        difficulty: 42,
        competition: "medium",
      },
    ];

    // Filter by query
    let filtered = suggestions;
    if (query) {
      filtered = suggestions.filter((s) =>
        s.keyword.toLowerCase().includes(query.toLowerCase()),
      );
    }

    res.status(200).json({
      success: true,
      data: {
        suggestions: filtered,
        total: filtered.length,
        query: query || "all",
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CHECK KEYWORD CANNIBALIZATION
// ============================================
exports.checkKeywordCannibalization = async (req, res, next) => {
  try {
    // In production, analyze all pages for keyword overlap
    const pages = [
      {
        url: "/",
        title: "Luxury Perfumes - Elegance",
        keywords: ["luxury", "perfumes", "elegance"],
      },
      {
        url: "/shop",
        title: "Buy Perfumes Online",
        keywords: ["buy", "perfumes", "online", "shop"],
      },
      {
        url: "/collections",
        title: "Perfume Collections",
        keywords: ["collections", "perfume", "sets"],
      },
      {
        url: "/product/1",
        title: "Chanel No. 5",
        keywords: ["chanel", "no. 5", "perfume"],
      },
    ];

    // Find duplicate keywords
    const keywordMap = {};
    const issues = [];

    pages.forEach((page) => {
      page.keywords.forEach((keyword) => {
        if (!keywordMap[keyword]) {
          keywordMap[keyword] = [];
        }
        keywordMap[keyword].push(page.url);
      });
    });

    // Find cannibalization
    Object.entries(keywordMap).forEach(([keyword, urls]) => {
      if (urls.length > 1) {
        issues.push({
          keyword,
          pages: urls,
          count: urls.length,
          severity: urls.length > 2 ? "high" : "medium",
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        issues,
        total: issues.length,
        recommendation:
          issues.length === 0
            ? "No keyword cannibalization detected"
            : `${issues.length} keywords are used on multiple pages`,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ANALYZE KEYWORD DIFFICULTY
// ============================================
exports.analyzeKeywordDifficulty = async (req, res, next) => {
  try {
    const { keyword } = req.query;

    // Simulated analysis
    // In production, connect to SEO tools API
    const analysis = {
      keyword: keyword || "luxury perfumes",
      difficulty: 65,
      searchVolume: 2400,
      competition: "high",
      cpc: 2.5,
      trend: "stable",
      topRankingPages: [
        { url: "example.com/perfumes", authority: 85 },
        { url: "rival.com/luxury-scents", authority: 72 },
        { url: "shop.com/fragrances", authority: 68 },
      ],
      recommendation: "Target long-tail variations",
      longTailSuggestions: [
        "best luxury perfumes for women",
        "affordable luxury perfumes",
        "luxury perfumes with free shipping",
      ],
    };

    res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
};
