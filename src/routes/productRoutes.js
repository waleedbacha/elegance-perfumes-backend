/**
 * Product Routes
 * Product management endpoints
 */

const express = require("express");
const router = express.Router();
const { body, param, query } = require("express-validator");
const { validate } = require("../middleware/validation");
const { protect, adminOnly } = require("../middleware/auth");
const {
  upload,
  handleUploadError,
  excelUpload,
} = require("../middleware/upload");

const rateLimiter = require("../middleware/rateLimiter");
const {
  getProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getProductsByCategory,
  getProductsByBrand,
  toggleProductStatus,
  updateProductStock,
  bulkUploadProducts,
  downloadBulkUploadTemplate,
  duplicateProduct,
} = require("../controllers/productController");

// ==========================================
// MIDDLEWARE: Parse FormData
// ==========================================

/**
 * Parse FormData - Flattens req.body.data JSON string into req.body
 * This middleware must run BEFORE validation
 */
const parseFormData = (req, res, next) => {
  try {
    // Check if data was sent as JSON string in FormData
    if (req.body.data) {
      let parsedData;

      try {
        parsedData =
          typeof req.body.data === "string"
            ? JSON.parse(req.body.data)
            : req.body.data;
      } catch (parseError) {
        console.error("❌ Failed to parse FormData:", parseError.message);
        return next();
      }

      if (parsedData && typeof parsedData === "object") {
        Object.keys(parsedData).forEach((key) => {
          if (key !== "images" && key !== "data") {
            req.body[key] = parsedData[key];
          }
        });
        delete req.body.data;
      }
    }
    next();
  } catch (error) {
    console.error("❌ FormData parsing error:", error);
    next();
  }
};

/**
 * Debug middleware to check uploaded files
 */
const debugUpload = (req, res, next) => {
  console.log("🔍 ========== DEBUG UPLOAD ==========");
  console.log("🔍 Content-Type:", req.headers["content-type"]);
  console.log("🔍 req.files:", req.files);
  console.log("🔍 req.file:", req.file);
  console.log("🔍 req.body:", req.body);
  console.log("🔍 ===================================");
  next();
};

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const productValidation = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("brand").notEmpty().withMessage("Brand is required"),
  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isString()
    .withMessage("Category must be a string"),
  // .isIn(["men", "women", "unisex", "niche"])
  // .withMessage("Invalid category"),
  body("description").notEmpty().withMessage("Description is required"),
  body("price").isNumeric().withMessage("Price must be a number"),
  body("price")
    .custom((value) => value > 0)
    .withMessage("Price must be greater than 0"),
  body("discount")
    .optional()
    .isNumeric()
    .withMessage("Discount must be a number"),
  body("discount")
    .optional()
    .custom((value) => value >= 0 && value <= 100)
    .withMessage("Discount must be 0-100"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "draft", "out-of-stock"]),
];

const productUpdateValidation = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Product name cannot be empty"),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  body("discount")
    .optional()
    .custom((value) => value >= 0 && value <= 100)
    .withMessage("Discount must be 0-100"),
];

const stockUpdateValidation = [
  body("quantity").isNumeric().withMessage("Quantity must be a number"),
  body("quantity")
    .custom((value) => value > 0)
    .withMessage("Quantity must be greater than 0"),
  body("operation")
    .optional()
    .isIn(["set", "add", "subtract"])
    .withMessage("Invalid operation"),
  body("size").optional().notEmpty().withMessage("Size cannot be empty"),
];

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/best-sellers", getBestSellers);
router.get("/category/:category", getProductsByCategory);
router.get("/brand/:brand", getProductsByBrand);
router.get("/slug/:slug", getProductBySlug);
router.get("/:id", getProduct);

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @route   POST /api/v1/products
 * @desc    Create product (Admin)
 * @access  Private/Admin
 *
 * IMPORTANT: Order of middleware matters!
 * 1. protect (auth)
 * 2. adminOnly (role check)
 * 3. upload.array (multer - processes files)
 * 4. debugUpload (logs what was received)
 * 5. parseFormData (parses JSON data)
 * 6. productValidation (validates)
 * 7. validate (checks validation)
 * 8. createProduct (controller)
 */
/**
 * @route   POST /api/v1/products/test-cloudinary-upload
 * @desc    Test Cloudinary upload directly
 * @access  Private/Admin
 */
router.post(
  "/test-cloudinary-upload",
  protect,
  adminOnly,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // ✅ Import cloudinary directly
      const cloudinary = require("cloudinary").v2;

      // ✅ Configure with your credentials
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });

      // ✅ Try direct upload using buffer
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "test",
            resource_type: "auto",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );

        // ✅ Write the buffer to the stream
        uploadStream.end(req.file.buffer);
      });

      res.json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          size: result.bytes,
          format: result.format,
        },
      });
    } catch (error) {
      console.error("❌ Test upload error:", error);
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          http_code: error.http_code,
          code: error.code,
        },
      });
    }
  },
);

router.post(
  "/",
  protect,
  adminOnly,
  upload.array("images", 10), // ← This processes files with field name "images"
  debugUpload, // ← Shows what multer received
  parseFormData,
  productValidation,
  validate,
  createProduct,
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product (Admin)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.array("images", 10),
  debugUpload,
  parseFormData,
  productUpdateValidation,
  validate,
  updateProduct,
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (Admin)
 * @access  Private/Admin
 */
router.delete("/:id", protect, adminOnly, deleteProduct);

/**
 * @route   POST /api/v1/products/bulk-import
 * @desc    Bulk import products (Admin)
 * @access  Private/Admin
 */
router.post("/bulk-import", protect, adminOnly, bulkImportProducts);

/**
 * @route   PUT /api/v1/products/:id/status
 * @desc    Toggle product status (Admin)
 * @access  Private/Admin
 */
router.put("/:id/status", protect, adminOnly, toggleProductStatus);

/**
 * @route   PUT /api/v1/products/:id/stock
 * @desc    Update product stock (Admin)
 * @access  Private/Admin
 */
/**
 * @route   POST /api/v1/products/bulk-upload
 * @desc    Bulk upload products from Excel/CSV
 * @access  Private/Admin
 */
router.post(
  "/bulk-upload",
  protect,
  adminOnly,
  excelUpload.single("file"), // ✅ Changed from upload to excelUpload
  bulkUploadProducts,
);

/**
 * @route   POST /api/v1/products/:id/duplicate
 * @desc    Duplicate product (Admin)
 * @access  Private/Admin
 */
router.post("/:id/duplicate", protect, adminOnly, duplicateProduct);

/**
 * @route   GET /api/v1/products/bulk-upload/template
 * @desc    Download bulk upload template
 * @access  Private/Admin
 */
router.get(
  "/bulk-upload/template",
  protect,
  adminOnly,
  downloadBulkUploadTemplate,
);

router.put(
  "/:id/stock",
  protect,
  adminOnly,
  stockUpdateValidation,
  validate,
  updateProductStock,
);

module.exports = router;
