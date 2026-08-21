/**
 * Product Controller
 * Product management operations
 */

const { AppError } = require("../middleware/errorHandler");
const Product = require("../models/Product");
const Review = require("../models/Review");
const Wishlist = require("../models/Wishlist");
const Inventory = require("../models/Inventory");
const Analytics = require("../models/Analytics");
const { MESSAGES, PRODUCT_STATUS } = require("../config/constants");
const cloudinary = require("../config/cloudinary");

/**
 * Get all products with filters and pagination
 */
/**
 * Get all products with filters and pagination
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      inStock,
      tags,
      isFeatured,
      isNew,
    } = req.query;

    // Build query
    const query = {};

    // ✅ Only add status if it's provided and not "all"
    if (status && status !== "all") {
      query.status = status;
    }

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
    if (isNew !== undefined) query.isNew = isNew === "true";
    if (tags) query.tags = { $in: tags.split(",") };
    if (inStock === "true") query.totalStock = { $gt: 0 };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (rating) {
      query["ratings.average"] = { $gte: parseFloat(rating) };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // ✅ Build sort - Priority: Status (active first), then requested sort
    const sort = {};

    // If status is "all" or not provided, sort by status first
    if (!status || status === "all") {
      // ✅ Custom sorting: active first, discontinued last
      sort.status = 1; // 1 = ascending, which puts "active" before "discontinued"
      // Then apply the requested sort
      const sortFields = {
        price: "price",
        rating: "ratings.average",
        newest: "createdAt",
        popularity: "purchasedCount",
        name: "name",
      };
      const sortField = sortFields[sortBy] || "createdAt";
      sort[sortField] = sortOrder === "asc" ? 1 : -1;
    } else {
      // If filtering by specific status, just use the requested sort
      const sortFields = {
        price: "price",
        rating: "ratings.average",
        newest: "createdAt",
        popularity: "purchasedCount",
        name: "name",
      };
      const sortField = sortFields[sortBy] || "createdAt";
      sort[sortField] = sortOrder === "asc" ? 1 : -1;
    }

    // Get products with pagination
    const result = await Product.paginate(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: "ratings",
    });

    // Get filter options for response
    const filterOptions = await Product.aggregate([
      { $match: { status: "active" } },
      {
        $facet: {
          brands: [
            { $group: { _id: "$brand" } },
            { $sort: { _id: 1 } },
            { $project: { brand: "$_id" } },
          ],
          categories: [
            { $group: { _id: "$category" } },
            { $sort: { _id: 1 } },
            { $project: { category: "$_id" } },
          ],
          priceRange: [
            {
              $group: {
                _id: null,
                min: { $min: "$price" },
                max: { $max: "$price" },
              },
            },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        products: result.products,
        pagination: result.pagination,
        filters: {
          brands: filterOptions[0]?.brands.map((b) => b.brand) || [],
          categories: filterOptions[0]?.categories.map((c) => c.category) || [],
          priceRange: filterOptions[0]?.priceRange[0] || { min: 0, max: 0 },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single product - OPTIMIZED
 */
exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Fetch product with all needed data in ONE query
    const product = await Product.findById(id)
      .populate({
        path: "reviews",
        options: { limit: 10, sort: { createdAt: -1 } },
        select: "rating comment title createdAt user verified",
        populate: { path: "user", select: "name" },
      })
      .populate("relatedProducts", "name brand price images ratings")
      .lean(); // ✅ Returns plain JS object for better performance

    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // ✅ Increment view count (async, don't await)
    Product.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();

    // ✅ Get related products (if any)
    let relatedProducts = [];
    if (product.relatedProducts?.length > 0) {
      relatedProducts = await Product.find({
        _id: { $in: product.relatedProducts },
        status: "active",
      })
        .select("name brand price images ratings")
        .limit(6)
        .lean();
    }

    // ✅ Get frequently bought with (if any)
    let frequentlyBought = [];
    if (product.frequentlyBoughtWith?.length > 0) {
      frequentlyBought = await Product.find({
        _id: { $in: product.frequentlyBoughtWith },
        status: "active",
      })
        .select("name brand price images ratings")
        .limit(4)
        .lean();
    }

    // ✅ Check wishlist (only if user is authenticated)
    let inWishlist = false;
    if (req.user) {
      const wishlist = await Wishlist.findOne(
        { user: req.user.id },
        { items: 1 }, // ✅ Only get items field
      ).lean();
      if (wishlist) {
        inWishlist = wishlist.items.some(
          (item) => item.product.toString() === id,
        );
      }
    }

    // ✅ Track analytics (async, don't await)
    Analytics.track({
      type: "product-view",
      user: req.user?.id,
      sessionId: req.sessionId,
      reference: { model: "Product", id: product._id },
      data: {
        productId: product._id,
        productName: product.name,
        productBrand: product.brand,
        productCategory: product.category,
      },
      source: req.query.source || "direct",
    }).catch(() => {}); // ✅ Ignore analytics errors

    res.status(200).json({
      success: true,
      data: {
        product,
        relatedProducts,
        frequentlyBought,
        inWishlist,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate product (Admin)
 */
exports.duplicateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // Create a copy of the product with new name
    const newName = `${product.name} (Copy)`;
    const slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Deep clone the product data
    const productData = product.toObject();
    delete productData._id;
    delete productData.createdAt;
    delete productData.updatedAt;
    delete productData.__v;
    delete productData.slug;
    delete productData.purchasedCount;
    delete productData.views;
    delete productData.wishlistCount;
    delete productData.shareCount;

    // Update for duplicate
    productData.name = newName;
    productData.slug = slug;
    productData.status = "draft";
    productData.isNew = true;
    productData.createdBy = req.user.id;

    // Reset stock to 0 for safety
    if (productData.sizes) {
      productData.sizes = productData.sizes.map((s) => ({
        ...s,
        stock: 0,
      }));
    }
    productData.totalStock = 0;
    productData.stockStatus = "out-of-stock";

    // Remove images (optional - you can keep them or remove)
    productData.images = [];

    const newProduct = new Product(productData);
    await newProduct.save();

    // Create inventory for the new product
    const inventory = new Inventory({
      product: newProduct._id,
      quantity: 0,
      lowStockThreshold: 5,
      history: [
        {
          type: "restock",
          quantity: 0,
          previousQuantity: 0,
          newQuantity: 0,
          reason: "Duplicated product",
          performedBy: req.user.id,
        },
      ],
    });
    await inventory.save();

    res.status(201).json({
      success: true,
      data: { product: newProduct },
      message: "Product duplicated successfully",
    });
  } catch (error) {
    console.error("❌ Duplicate product error:", error);
    next(error);
  }
};

/**
 * Get product by slug - OPTIMIZED
 */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug, status: "active" })
      .populate({
        path: "reviews",
        options: { limit: 10, sort: { createdAt: -1 } },
        select: "rating comment title createdAt user verified",
        populate: { path: "user", select: "name" },
      })
      .populate("relatedProducts", "name brand price images ratings")
      .lean();

    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // ✅ Increment view count (async)
    Product.findOneAndUpdate(
      { slug, status: "active" },
      { $inc: { views: 1 } },
    ).exec();

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create product (Admin)
 */
/**
 * Create product (Admin) - FIXED
 */
/**
 * Create product (Admin) - FIXED with size comparePrice/discount
 */
exports.createProduct = async (req, res, next) => {
  try {
    // ✅ Parse data from FormData
    let productData;
    if (req.body.data) {
      productData =
        typeof req.body.data === "string"
          ? JSON.parse(req.body.data)
          : req.body.data;
    } else {
      productData = req.body;
    }

    console.log("📦 Product data:", productData);
    console.log("📸 Files received:", req.files?.length || 0);

    const {
      name,
      brand,
      category,
      description,
      shortDescription,
      price,
      comparePrice,
      discount,
      stock,
      sizes,
      notes,
      longevity,
      intensity,
      sillage,
      season,
      occasion,
      status = "draft",
      isFeatured = false,
      isNew = true,
      tags,
      metaTitle,
      metaDescription,
      metaKeywords,
    } = productData;

    // Check if product exists
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      throw new AppError(
        "Product with this name already exists",
        409,
        "PRODUCT_EXISTS",
      );
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // ==========================================
    // ✅ HANDLE IMAGES
    // ==========================================

    const images = [];
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} images...`);

      const axios = require("axios");
      const FormData = require("form-data");

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(`📸 Uploading image ${i + 1}: ${file.originalname}`);

        try {
          const base64Image = file.buffer.toString("base64");
          const dataUrl = `data:${file.mimetype};base64,${base64Image}`;

          const form = new FormData();
          form.append("file", dataUrl);
          form.append(
            "upload_preset",
            process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes",
          );
          form.append("folder", "elegance-perfumes/products");

          const response = await axios.post(cloudinaryUrl, form, {
            headers: { ...form.getHeaders() },
            timeout: 60000,
          });

          const result = response.data;

          images.push({
            url: result.secure_url,
            publicId: result.public_id,
            alt: `${name} - Image ${i + 1}`,
            isMain: i === 0,
            order: i,
            width: result.width,
            height: result.height,
            size: result.bytes,
            format: result.format,
          });

          console.log(`✅ Image ${i + 1} uploaded: ${result.secure_url}`);
        } catch (uploadError) {
          console.error(
            `❌ Failed to upload image ${i + 1}:`,
            uploadError.message,
          );
        }
      }
    }

    // ✅ Parse sizes with comparePrice and discount
    let parsedSizes = [];
    if (sizes) {
      try {
        parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      } catch (error) {
        parsedSizes = [];
      }
    }

    // ✅ Process sizes with comparePrice and discount
    const processedSizes = parsedSizes.map((size) => {
      const sizePrice = parseFloat(size.price) || 0;
      const sizeComparePrice = parseFloat(size.comparePrice) || 0;
      let sizeDiscount = parseFloat(size.discount) || 0;

      // Auto-calculate discount if comparePrice > price
      if (
        sizeComparePrice > 0 &&
        sizeComparePrice > sizePrice &&
        sizeDiscount === 0
      ) {
        sizeDiscount = Math.round(
          ((sizeComparePrice - sizePrice) / sizeComparePrice) * 100,
        );
      }

      return {
        size: size.size || "50ml",
        stock: parseInt(size.stock) || 0,
        price: sizePrice,
        comparePrice: sizeComparePrice > 0 ? sizeComparePrice : undefined,
        discount: sizeDiscount,
      };
    });

    // ✅ If no sizes, create default from stock
    if (processedSizes.length === 0 && stock) {
      processedSizes.push({
        size: "50ml",
        stock: parseInt(stock) || 0,
        price: parseFloat(price) || 0,
        comparePrice: parseFloat(comparePrice) || undefined,
        discount: parseFloat(discount) || 0,
      });
    }

    // ✅ Find default size (50ml or first)
    const defaultSize =
      processedSizes.find((s) => s.size === "50ml") || processedSizes[0];

    // Parse notes
    let parsedNotes = {};
    if (notes) {
      try {
        parsedNotes = typeof notes === "string" ? JSON.parse(notes) : notes;
      } catch (error) {
        parsedNotes = { top: [], middle: [], base: [] };
      }
    }

    // Create product
    const product = new Product({
      name,
      slug,
      brand,
      category,
      description,
      shortDescription,
      price: defaultSize?.price || parseFloat(price) || 0,
      comparePrice:
        defaultSize?.comparePrice || parseFloat(comparePrice) || undefined,
      discount: defaultSize?.discount || 0,
      sizes: processedSizes,
      totalStock: processedSizes.reduce((sum, s) => sum + (s.stock || 0), 0),
      notes: parsedNotes,
      longevity: longevity ? parseInt(longevity) : undefined,
      intensity,
      sillage,
      season: season
        ? typeof season === "string"
          ? season.split(",")
          : season
        : [],
      occasion: occasion
        ? typeof occasion === "string"
          ? occasion.split(",")
          : occasion
        : [],
      tags: tags ? (typeof tags === "string" ? tags.split(",") : tags) : [],
      status,
      isFeatured: isFeatured === true || isFeatured === "true",
      isNew: isNew === true || isNew === "true",
      images,
      metaTitle,
      metaDescription,
      metaKeywords: metaKeywords
        ? typeof metaKeywords === "string"
          ? metaKeywords.split(",")
          : metaKeywords
        : [],
      createdBy: req.user.id,
    });

    await product.save();

    // Create inventory
    const inventory = new Inventory({
      product: product._id,
      quantity: product.totalStock,
      lowStockThreshold: 5,
      history: [
        {
          type: "restock",
          quantity: product.totalStock,
          previousQuantity: 0,
          newQuantity: product.totalStock,
          reason: "Initial stock",
          performedBy: req.user.id,
        },
      ],
    });
    await inventory.save();

    res.status(201).json({
      success: true,
      data: { product },
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("❌ Create product error:", error);
    next(error);
  }
};

/**
 * Delete product (Admin) - FIXED
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // ==========================================
    // ✅ DELETE IMAGES FROM CLOUDINARY - FIXED
    // ==========================================

    if (product.images && product.images.length > 0) {
      console.log(
        `🗑️ Deleting ${product.images.length} images from Cloudinary...`,
      );

      const axios = require("axios");
      const crypto = require("crypto");

      for (const image of product.images) {
        if (image.publicId) {
          try {
            // ✅ Generate signature
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = crypto
              .createHash("sha256")
              .update(
                `public_id=${image.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
              )
              .digest("hex");

            // ✅ Delete using Cloudinary API
            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;

            await axios.post(cloudinaryUrl, {
              public_id: image.publicId,
              timestamp: timestamp,
              signature: signature,
              api_key: process.env.CLOUDINARY_API_KEY,
            });

            console.log(`✅ Deleted image: ${image.publicId}`);
          } catch (error) {
            console.error(
              `❌ Failed to delete image ${image.publicId}:`,
              error.response?.data || error.message,
            );
            // Continue with other images even if one fails
          }
        }
      }
    }

    // ==========================================
    // ✅ DELETE INVENTORY
    // ==========================================
    await Inventory.findOneAndDelete({ product: product._id });

    // ==========================================
    // ✅ DELETE REVIEWS
    // ==========================================
    await Review.deleteMany({ product: product._id });

    // ==========================================
    // ✅ SOFT DELETE PRODUCT
    // ==========================================
    product.status = "discontinued";
    product.images = []; // Remove images from product as well
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete product error:", error);
    next(error);
  }
};

/**
 * Bulk import products (Admin)
 */
exports.bulkImportProducts = async (req, res, next) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new AppError("Products array is required", 400, "INVALID_DATA");
    }

    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const productData of products) {
      try {
        // Generate slug
        const slug = productData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        const product = new Product({
          ...productData,
          slug,
          createdBy: req.user.id,
        });

        await product.save();

        // Create inventory
        const inventory = new Inventory({
          product: product._id,
          quantity: product.totalStock || 0,
          history: [
            {
              type: "restock",
              quantity: product.totalStock || 0,
              previousQuantity: 0,
              newQuantity: product.totalStock || 0,
              reason: "Bulk import",
              performedBy: req.user.id,
            },
          ],
        });
        await inventory.save();

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: productData.name,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: results,
      message: `Imported ${results.success} of ${results.total} products`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product statistics (Admin)
 */
exports.getProductStats = async (req, res, next) => {
  try {
    const stats = await Product.aggregate([
      {
        $facet: {
          total: [{ $count: "count" }],
          active: [{ $match: { status: "active" } }, { $count: "count" }],
          inactive: [{ $match: { status: "inactive" } }, { $count: "count" }],
          draft: [{ $match: { status: "draft" } }, { $count: "count" }],
          outOfStock: [
            {
              $match: { $or: [{ status: "out-of-stock" }, { totalStock: 0 }] },
            },
            { $count: "count" },
          ],
          discontinued: [
            { $match: { status: "discontinued" } },
            { $count: "count" },
          ],
          featured: [{ $match: { isFeatured: true } }, { $count: "count" }],
        },
      },
    ]);

    const result = stats[0] || {};

    res.status(200).json({
      success: true,
      data: {
        total: result.total?.[0]?.count || 0,
        active: result.active?.[0]?.count || 0,
        inactive: result.inactive?.[0]?.count || 0,
        draft: result.draft?.[0]?.count || 0,
        outOfStock: result.outOfStock?.[0]?.count || 0,
        discontinued: result.discontinued?.[0]?.count || 0,
        featured: result.featured?.[0]?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured products
 */
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.getFeatured(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get new arrivals
 */
exports.getNewArrivals = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.getNewArrivals(parseInt(limit));

    // ✅ Force isNew to true for ALL new arrivals
    const productsWithNewFlag = products.map((product) => {
      const obj = product.toObject ? product.toObject() : product;
      return {
        ...obj,
        isNew: true, // Force isNew to true
      };
    });

    res.status(200).json({
      success: true,
      data: { products: productsWithNewFlag },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get best sellers
 */
exports.getBestSellers = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.getBestSellers(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by category
 */
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await Product.paginate(
      { category, status: "active" },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
      },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get products by brand
 */
exports.getProductsByBrand = async (req, res, next) => {
  try {
    const { brand } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const result = await Product.paginate(
      { brand, status: "active" },
      {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
      },
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product status (Admin)
 */
exports.toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(PRODUCT_STATUS).includes(status)) {
      throw new AppError("Invalid status", 400, "INVALID_STATUS");
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    product.status = status;
    await product.save();

    res.status(200).json({
      success: true,
      data: { product },
      message: `Product status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Update product (Admin) - FIXED with size comparePrice/discount
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ✅ Parse JSON data from FormData
    let updates;
    if (req.body.data) {
      updates =
        typeof req.body.data === "string"
          ? JSON.parse(req.body.data)
          : req.body.data;
    } else {
      updates = req.body;
    }

    console.log("📦 Update data:", updates);
    console.log("📸 Files received:", req.files?.length || 0);

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // ✅ STORE OLD TOTAL STOCK BEFORE ANY CHANGES
    const oldTotalStock = product.totalStock;
    console.log(`📊 Old total stock: ${oldTotalStock}`);

    // ==========================================
    // ✅ HANDLE IMAGE UPDATES
    // ==========================================

    let keepImageUrls = [];
    if (updates.keepImages && Array.isArray(updates.keepImages)) {
      keepImageUrls = updates.keepImages;
    }

    let remainingImages = [];
    const imagesToDelete = [];

    for (const img of product.images) {
      if (keepImageUrls.includes(img.url)) {
        remainingImages.push(img);
      } else {
        imagesToDelete.push(img);
      }
    }

    if (imagesToDelete.length > 0) {
      const axios = require("axios");
      for (const img of imagesToDelete) {
        if (img.publicId) {
          try {
            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = require("crypto")
              .createHash("sha256")
              .update(
                `public_id=${img.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
              )
              .digest("hex");

            await axios.post(cloudinaryUrl, {
              public_id: img.publicId,
              timestamp: timestamp,
              signature: signature,
              api_key: process.env.CLOUDINARY_API_KEY,
            });
          } catch (error) {
            console.error(
              `❌ Failed to delete image: ${img.publicId}`,
              error.message,
            );
          }
        }
      }
    }

    let newImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`📸 Uploading ${req.files.length} new images...`);

      const axios = require("axios");
      const FormData = require("form-data");
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          const base64Image = file.buffer.toString("base64");
          const dataUrl = `data:${file.mimetype};base64,${base64Image}`;

          const form = new FormData();
          form.append("file", dataUrl);
          form.append(
            "upload_preset",
            process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes",
          );
          form.append("folder", "elegance-perfumes/products");

          const response = await axios.post(cloudinaryUrl, form, {
            headers: { ...form.getHeaders() },
            timeout: 60000,
          });

          const result = response.data;

          newImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            alt: `${product.name} - Image ${i + 1}`,
            isMain: false,
            order: remainingImages.length + i,
          });
        } catch (error) {
          console.error(`❌ Failed to upload image ${i + 1}:`, error.message);
        }
      }
    }

    let finalImages = [...remainingImages, ...newImages];

    if (finalImages.length > 0) {
      finalImages = finalImages.map((img, index) => ({
        ...img,
        isMain: index === 0,
        order: index,
      }));
    }

    // ==========================================
    // ✅ UPDATE SIZES WITH comparePrice AND discount
    // ==========================================

    if (updates.sizes) {
      let sizesArray = updates.sizes;
      if (typeof sizesArray === "string") {
        try {
          sizesArray = JSON.parse(sizesArray);
        } catch (e) {
          sizesArray = [];
        }
      }

      const processedSizes = sizesArray.map((size) => {
        const price = parseFloat(size.price) || 0;
        const comparePrice = parseFloat(size.comparePrice) || 0;
        let discount = parseFloat(size.discount) || 0;

        if (comparePrice > 0 && comparePrice > price && discount === 0) {
          discount = Math.round(((comparePrice - price) / comparePrice) * 100);
        }

        return {
          size: size.size || "50ml",
          stock: parseInt(size.stock) || 0,
          price: price,
          comparePrice: comparePrice > 0 ? comparePrice : undefined,
          discount: discount,
        };
      });

      updates.sizes = processedSizes;
      updates.totalStock = processedSizes.reduce(
        (sum, s) => sum + (s.stock || 0),
        0,
      );

      const defaultSize =
        processedSizes.find((s) => s.size === "50ml") || processedSizes[0];
      if (defaultSize) {
        updates.price = defaultSize.price || 0;
        updates.comparePrice = defaultSize.comparePrice || undefined;
        updates.discount = defaultSize.discount || 0;
      }
    }

    // ==========================================
    // ✅ UPDATE PRODUCT
    // ==========================================

    delete updates.keepImages;
    delete updates.removeImages;
    delete updates.images;

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== "") {
        product[key] = updates[key];
      }
    });

    product.images = finalImages;

    if (updates.name && updates.name !== product.name) {
      product.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    await product.save();

    // ✅ LOG FOR DEBUG
    console.log(`📊 New total stock: ${product.totalStock}`);
    console.log(`📊 Difference: ${product.totalStock - oldTotalStock}`);

    // ==========================================
    // ✅ UPDATE INVENTORY - FIXED
    // ==========================================

    // ✅ Use oldTotalStock from BEFORE the update
    // Get or create inventory
    let inventory = await Inventory.findOne({ product: product._id });

    if (!inventory) {
      // Create inventory if it doesn't exist
      inventory = new Inventory({
        product: product._id,
        quantity: product.totalStock,
        availableQuantity: product.totalStock,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        status: product.totalStock > 0 ? "in-stock" : "out-of-stock",
        history: [
          {
            type: "restock",
            quantity: product.totalStock,
            previousQuantity: 0,
            newQuantity: product.totalStock,
            reason: "Initial stock from product update",
            performedBy: req.user.id,
          },
        ],
      });
      await inventory.save();
      console.log(`✅ Created new inventory for: ${product.name}`);
    } else {
      // ✅ Calculate difference using the stored oldTotalStock
      const diff = product.totalStock - oldTotalStock;
      console.log(`📊 Inventory diff: ${diff}`);

      if (diff !== 0) {
        // Update inventory
        inventory.quantity = product.totalStock;
        inventory.availableQuantity = Math.max(
          0,
          product.totalStock - (inventory.reservedQuantity || 0),
        );

        // Update status
        if (inventory.availableQuantity <= 0) {
          inventory.status = "out-of-stock";
        } else if (inventory.availableQuantity <= inventory.lowStockThreshold) {
          inventory.status = "low-stock";
        } else {
          inventory.status = "in-stock";
        }

        // Add history entry
        inventory.history.push({
          type: diff > 0 ? "restock" : "adjustment",
          quantity: Math.abs(diff),
          previousQuantity: oldTotalStock,
          newQuantity: product.totalStock,
          reason:
            diff > 0
              ? "Stock increased via product update"
              : "Stock decreased via product update",
          performedBy: req.user.id,
        });

        await inventory.save();
        console.log(
          `✅ Updated inventory for: ${product.name} (${oldTotalStock} → ${product.totalStock})`,
        );
      } else {
        console.log(`ℹ️ No inventory change needed for: ${product.name}`);
      }
    }

    const updatedProduct = await Product.findById(id)
      .populate({
        path: "reviews",
        options: { limit: 10, sort: { createdAt: -1 } },
        select: "rating comment title createdAt user verified",
        populate: { path: "user", select: "name" },
      })
      .populate("relatedProducts", "name brand price images ratings");

    res.status(200).json({
      success: true,
      data: { product: updatedProduct },
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("❌ Update product error:", error);
    next(error);
  }
};

/**
 * Update product stock (Admin)
 */
exports.updateProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { size, quantity, operation = "set" } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    if (operation === "set") {
      if (size) {
        const sizeItem = product.sizes.find((s) => s.size === size);
        if (!sizeItem) {
          throw new AppError("Size not found", 404, "SIZE_NOT_FOUND");
        }
        sizeItem.stock = parseInt(quantity);
      } else {
        product.totalStock = parseInt(quantity);
      }
    } else if (operation === "add") {
      if (size) {
        const sizeItem = product.sizes.find((s) => s.size === size);
        if (!sizeItem) {
          throw new AppError("Size not found", 404, "SIZE_NOT_FOUND");
        }
        sizeItem.stock += parseInt(quantity);
      } else {
        product.totalStock += parseInt(quantity);
      }
    } else if (operation === "subtract") {
      if (size) {
        const sizeItem = product.sizes.find((s) => s.size === size);
        if (!sizeItem) {
          throw new AppError("Size not found", 404, "SIZE_NOT_FOUND");
        }
        if (sizeItem.stock < parseInt(quantity)) {
          throw new AppError("Insufficient stock", 400, "INSUFFICIENT_STOCK");
        }
        sizeItem.stock -= parseInt(quantity);
      } else {
        if (product.totalStock < parseInt(quantity)) {
          throw new AppError("Insufficient stock", 400, "INSUFFICIENT_STOCK");
        }
        product.totalStock -= parseInt(quantity);
      }
    }

    // Recalculate total stock
    if (size) {
      product.totalStock = product.sizes.reduce(
        (sum, s) => sum + (s.stock || 0),
        0,
      );
    }

    // Update stock status
    if (product.totalStock <= 0) {
      product.stockStatus = "out-of-stock";
    } else if (product.totalStock <= product.lowStockThreshold) {
      product.stockStatus = "low-stock";
    } else {
      product.stockStatus = "in-stock";
    }

    await product.save();

    // Update inventory
    await Inventory.findOneAndUpdate(
      { product: product._id },
      {
        quantity: product.totalStock,
        updatedAt: new Date(),
        $push: {
          history: {
            type: "adjustment",
            quantity: product.totalStock,
            reason: `Stock ${operation} by ${quantity}`,
            performedBy: req.user.id,
          },
        },
      },
      { upsert: true, new: true },
    );

    res.status(200).json({
      success: true,
      data: { product },
      message: "Stock updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const bulkUploadService = require("../services/bulkUploadService");

/**
 * Bulk upload products from Excel/CSV (Admin)
 */
exports.bulkUploadProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("Please upload a file", 400, "FILE_REQUIRED");
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new AppError(
        "Invalid file type. Please upload Excel or CSV file",
        400,
        "INVALID_FILE_TYPE",
      );
    }

    console.log(`📊 Processing bulk upload: ${req.file.originalname}`);
    console.log(`📊 File size: ${req.file.size} bytes`);

    const results = await bulkUploadService.processProductFile(
      req.file.buffer,
      req.user.id,
    );

    res.status(200).json({
      success: true,
      data: results,
      message: `Bulk upload completed: ${results.success} products added, ${results.failed} failed`,
    });
  } catch (error) {
    console.error("❌ Bulk upload error:", error);
    next(error);
  }
};

/**
 * Download bulk upload template (Admin)
 */
exports.downloadBulkUploadTemplate = async (req, res, next) => {
  try {
    const XLSX = require("xlsx");

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Define headers with required/optional markers
    const headers = [
      { header: "Name *", width: 25 },
      { header: "Brand *", width: 20 },
      { header: "Category *", width: 15 },
      { header: "Description *", width: 50 },
      { header: "Short Description", width: 40 },
      { header: "Price", width: 15 },
      { header: "Compare Price", width: 15 },
      { header: "Discount", width: 12 },
      { header: "Sizes *", width: 45 },
      { header: "Top Notes", width: 30 },
      { header: "Middle Notes", width: 30 },
      { header: "Base Notes", width: 30 },
      { header: "Tags", width: 25 },
      { header: "Season", width: 20 },
      { header: "Occasion", width: 25 },
      { header: "Featured", width: 12 },
      { header: "New", width: 12 },
      { header: "Status", width: 15 },
      { header: "Image URLs", width: 50 },
      { header: "Meta Title", width: 30 },
      { header: "Meta Description", width: 50 },
      { header: "Meta Keywords", width: 30 },
    ];

    // Sample data row
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

    // Create worksheet data
    const wsData = [
      headers.map((h) => h.header), // Header row
      sampleRow, // Sample data row
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = headers.map((h) => ({ wch: h.width }));

    // Add some styling info as comments (optional)
    const notes = [
      "Name: Product name (required)",
      "Brand: Brand name (required)",
      "Category: men, women, unisex, niche (required)",
      "Description: Full description (required, min 50 characters)",
      "Short Description: Brief description (optional)",
      "Price: Main price (optional if sizes provided)",
      "Compare Price: Original price (optional)",
      "Discount: Discount percentage (optional)",
      "Sizes: Format: size:price:stock:comparePrice:discount (required)",
      "  Example: 50ml:15000:50:18000:20",
      "  Multiple sizes separated by commas",
      "Top Notes: Comma separated (optional)",
      "Middle Notes: Comma separated (optional)",
      "Base Notes: Comma separated (optional)",
      "Tags: Comma separated (optional)",
      "Season: Comma separated (optional)",
      "Occasion: Comma separated (optional)",
      "Featured: true/false (optional, default: false)",
      "New: true/false (optional, default: true)",
      "Status: active/inactive/draft (optional, default: active)",
      "Image URLs: Comma separated URLs (optional)",
    ];

    // Add notes as a second sheet
    const notesSheet = XLSX.utils.aoa_to_sheet([
      ["BULK UPLOAD INSTRUCTIONS"],
      [""],
      ["Column Format Guide:"],
      ...notes.map((n) => [n]),
      [""],
      ["Fields marked with * are required"],
      ["For Sizes: format is size:price:stock:comparePrice:discount"],
      [
        "Example: 50ml:15000:50:18000:20 means 50ml bottle, PKR 15000, 50 in stock, compare price PKR 18000, 20% discount",
      ],
      ["Multiple sizes: separate with commas"],
    ]);

    XLSX.utils.book_append_sheet(wb, notesSheet, "Instructions");

    // Create the main sheet
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    // ✅ Generate buffer with proper format
    const buffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "buffer",
      bookSST: false,
    });

    // ✅ Set proper headers for Excel download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=product-bulk-upload-template.xlsx`,
    );
    res.setHeader("Content-Length", buffer.length);

    // ✅ Send the buffer
    res.status(200).send(buffer);
  } catch (error) {
    console.error("❌ Template download error:", error);
    next(error);
  }
};
