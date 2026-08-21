/**
 * Bulk Upload Service
 * Handles Excel/CSV file processing for products
 */

const XLSX = require("xlsx");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");

class BulkUploadService {
  /**
   * Get column value with multiple possible names
   */
  getColumnValue(row, possibleNames) {
    for (const name of possibleNames) {
      // Check exact match
      if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
        return row[name];
      }
      // Check case-insensitive
      const lowerName = name.toLowerCase();
      for (const key of Object.keys(row)) {
        if (key.toLowerCase() === lowerName) {
          if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
            return row[key];
          }
        }
      }
    }
    return null;
  }

  /**
   * Get column value by exact key (with fallback)
   */
  getColumnValueExact(row, key) {
    // Try exact match first
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
    // Try case-insensitive
    const lowerKey = key.toLowerCase();
    for (const k of Object.keys(row)) {
      if (k.toLowerCase() === lowerKey) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
          return row[k];
        }
      }
    }
    return null;
  }

  /**
   * Process uploaded Excel/CSV file
   */
  async processProductFile(fileBuffer, userId) {
    try {
      // Read the Excel file
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      if (!rawData || rawData.length === 0) {
        throw new Error("No data found in the file");
      }

      console.log(`📊 Processing ${rawData.length} rows from Excel`);

      const results = {
        total: rawData.length,
        success: 0,
        failed: 0,
        errors: [],
        products: [],
      };

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const rowNumber = i + 2;

        try {
          // Get values with multiple possible column names
          const name = this.getColumnValue(row, [
            "Name *",
            "Name",
            "Product Name",
            "productName",
          ]);
          const brand = this.getColumnValue(row, ["Brand *", "Brand", "brand"]);
          const category = this.getColumnValue(row, [
            "Category *",
            "Category",
            "category",
          ]);
          const description = this.getColumnValue(row, [
            "Description *",
            "Description",
            "description",
          ]);

          // Validate required fields
          if (!name) {
            throw new Error(
              `Product name is required. Found: "${JSON.stringify(Object.keys(row))}"`,
            );
          }
          if (!brand) {
            throw new Error(
              `Brand is required. Found: "${JSON.stringify(Object.keys(row))}"`,
            );
          }
          if (!category) {
            throw new Error(
              `Category is required. Found: "${JSON.stringify(Object.keys(row))}"`,
            );
          }
          if (!description) {
            throw new Error(
              `Description is required. Found: "${JSON.stringify(Object.keys(row))}"`,
            );
          }

          // Get optional fields
          const shortDescription = this.getColumnValue(row, [
            "Short Description",
            "shortDescription",
            "ShortDescription",
          ]);
          const price =
            parseFloat(this.getColumnValue(row, ["Price", "price"])) || 0;
          const comparePrice =
            parseFloat(
              this.getColumnValue(row, [
                "Compare Price",
                "comparePrice",
                "ComparePrice",
              ]),
            ) || 0;
          const discount =
            parseFloat(this.getColumnValue(row, ["Discount", "discount"])) || 0;

          // Get sizes
          const sizesStr = this.getColumnValue(row, [
            "Sizes *",
            "Sizes",
            "sizes",
          ]);
          let sizes = [];
          if (sizesStr) {
            const sizeItems = sizesStr.split(",").map((s) => s.trim());
            for (const item of sizeItems) {
              const parts = item.split(":");
              if (parts.length >= 2) {
                sizes.push({
                  size: parts[0].trim(),
                  price: parseFloat(parts[1]) || 0,
                  stock: parseInt(parts[2]) || 0,
                  comparePrice: parts[3] ? parseFloat(parts[3]) : undefined,
                  discount: parts[4] ? parseFloat(parts[4]) : 0,
                });
              }
            }
          }

          // If no sizes provided but price exists, create default size
          if (sizes.length === 0 && price > 0) {
            sizes.push({
              size: "50ml",
              price: price,
              stock: 0,
              comparePrice: comparePrice || undefined,
              discount: discount || 0,
            });
          }

          // Parse notes
          const topNotes =
            this.getColumnValue(row, ["Top Notes", "topNotes", "TopNotes"]) ||
            "";
          const middleNotes =
            this.getColumnValue(row, [
              "Middle Notes",
              "middleNotes",
              "MiddleNotes",
            ]) || "";
          const baseNotes =
            this.getColumnValue(row, [
              "Base Notes",
              "baseNotes",
              "BaseNotes",
            ]) || "";

          // Parse tags
          const tagsStr = this.getColumnValue(row, ["Tags", "tags"]) || "";
          const tagsArray = tagsStr
            ? tagsStr
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];

          // Parse season
          const seasonStr =
            this.getColumnValue(row, ["Season", "season"]) || "";
          const seasonArray = seasonStr
            ? seasonStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];

          // Parse occasion
          const occasionStr =
            this.getColumnValue(row, ["Occasion", "occasion"]) || "";
          const occasionArray = occasionStr
            ? occasionStr
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : [];

          // Parse boolean fields
          const featuredVal = this.getColumnValue(row, [
            "Featured",
            "isFeatured",
            "featured",
          ]);
          const isFeatured = this.parseBoolean(featuredVal);

          const newVal = this.getColumnValue(row, ["New", "isNew", "new"]);
          const isNew = this.parseBoolean(newVal);

          const statusVal = this.getColumnValue(row, ["Status", "status"]);
          const status = statusVal ? statusVal.toLowerCase() : "active";

          // Get image URLs
          const imageUrls =
            this.getColumnValue(row, [
              "Image URLs",
              "imageUrls",
              "ImageUrls",
            ]) || "";

          // Get meta fields
          const metaTitle =
            this.getColumnValue(row, [
              "Meta Title",
              "metaTitle",
              "MetaTitle",
            ]) || "";
          const metaDescription =
            this.getColumnValue(row, [
              "Meta Description",
              "metaDescription",
              "MetaDescription",
            ]) || "";
          const metaKeywords =
            this.getColumnValue(row, [
              "Meta Keywords",
              "metaKeywords",
              "MetaKeywords",
            ]) || "";

          // Build product data
          const productData = {
            name,
            brand,
            category: category.toLowerCase(),
            description,
            shortDescription: shortDescription || "",
            price: sizes.length > 0 ? sizes[0].price : price,
            comparePrice:
              sizes.length > 0 && sizes[0].comparePrice
                ? sizes[0].comparePrice
                : comparePrice || undefined,
            discount:
              sizes.length > 0 && sizes[0].discount
                ? sizes[0].discount
                : discount,
            sizes,
            totalStock: sizes.reduce((sum, s) => sum + (s.stock || 0), 0),
            notes: {
              top: topNotes
                ? topNotes
                    .split(",")
                    .map((n) => n.trim())
                    .filter(Boolean)
                : [],
              middle: middleNotes
                ? middleNotes
                    .split(",")
                    .map((n) => n.trim())
                    .filter(Boolean)
                : [],
              base: baseNotes
                ? baseNotes
                    .split(",")
                    .map((n) => n.trim())
                    .filter(Boolean)
                : [],
            },
            tags: tagsArray,
            season: seasonArray,
            occasion: occasionArray,
            isFeatured,
            isNew,
            status: status,
            metaTitle,
            metaDescription,
            metaKeywords: metaKeywords
              ? metaKeywords
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean)
              : [],
            imageUrls,
          };

          const product = await this.createProduct(productData, userId);
          results.products.push(product);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            data: row,
            error: error.message,
          });
        }
      }

      console.log(
        `✅ Bulk upload completed: ${results.success} success, ${results.failed} failed`,
      );
      return results;
    } catch (error) {
      console.error("❌ Bulk upload error:", error);
      throw error;
    }
  }

  /**
   * Parse boolean values
   */
  parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      return (
        lower === "true" || lower === "yes" || lower === "1" || lower === "y"
      );
    }
    if (typeof value === "number") {
      return value === 1;
    }
    return false;
  }

  /**
   * Create product from transformed data
   */
  async createProduct(productData, userId) {
    // Generate slug
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Check if product already exists
    const existing = await Product.findOne({ name: productData.name });
    if (existing) {
      throw new Error(`Product "${productData.name}" already exists`);
    }

    // Create product
    const product = new Product({
      name: productData.name,
      slug,
      brand: productData.brand,
      category: productData.category,
      description: productData.description,
      shortDescription: productData.shortDescription || "",
      price: productData.price,
      comparePrice: productData.comparePrice,
      discount: productData.discount || 0,
      sizes: productData.sizes,
      totalStock: productData.totalStock || 0,
      notes: productData.notes || { top: [], middle: [], base: [] },
      tags: productData.tags || [],
      season: productData.season || [],
      occasion: productData.occasion || [],
      isFeatured: productData.isFeatured || false,
      isNew: productData.isNew !== undefined ? productData.isNew : true,
      status: productData.status || "active",
      metaTitle: productData.metaTitle || "",
      metaDescription: productData.metaDescription || "",
      metaKeywords: productData.metaKeywords || [],
      createdBy: userId,
      images: [],
    });

    await product.save();

    // Create inventory
    const inventory = new Inventory({
      product: product._id,
      quantity: product.totalStock || 0,
      lowStockThreshold: 5,
      history: [
        {
          type: "restock",
          quantity: product.totalStock || 0,
          previousQuantity: 0,
          newQuantity: product.totalStock || 0,
          reason: "Bulk import",
          performedBy: userId,
        },
      ],
    });
    await inventory.save();

    console.log(`✅ Created product: ${productData.name} (${product._id})`);
    return product;
  }

  /**
   * Generate template for bulk upload
   */
  generateTemplate() {
    const headers = [
      "Name *",
      "Brand *",
      "Category *",
      "Description *",
      "Short Description",
      "Price",
      "Compare Price",
      "Discount",
      "Sizes *",
      "Top Notes",
      "Middle Notes",
      "Base Notes",
      "Tags",
      "Season",
      "Occasion",
      "Featured",
      "New",
      "Status",
      "Image URLs",
      "Meta Title",
      "Meta Description",
      "Meta Keywords",
    ];

    const sampleRow = [
      "Chanel No. 5",
      "Chanel",
      "women",
      "A timeless classic fragrance that revolutionized perfumery with its aldehydic floral composition. This iconic scent features a sophisticated blend of florals and aldehydes that creates an unforgettable impression.",
      "The iconic floral aldehyde fragrance",
      "15000",
      "18000",
      "20",
      "50ml:15000:50:18000:20,100ml:25000:30:30000:17",
      "Bergamot, Lemon, Neroli",
      "Rose, Jasmine, Ylang-Ylang",
      "Vanilla, Sandalwood, Amber",
      "luxury, floral, classic",
      "spring, summer",
      "everyday, party",
      "true",
      "true",
      "active",
      "https://example.com/image1.jpg,https://example.com/image2.jpg",
      "Chanel No. 5 - Luxury Fragrance",
      "Discover the iconic Chanel No. 5 fragrance with its timeless floral aldehydic composition.",
      "Chanel No. 5, luxury perfume, floral fragrance",
    ];

    return {
      headers,
      sampleRow,
    };
  }
}

module.exports = new BulkUploadService();
