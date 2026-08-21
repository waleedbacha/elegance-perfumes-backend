/**
 * Upload Middleware
 * File upload handling with Cloudinary
 */

const multer = require("multer");
const path = require("path");
const { AppError } = require("./errorHandler");
const cloudinary = require("../config/cloudinary");

// Memory storage for Cloudinary upload
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type. Only images are allowed.",
        400,
        "INVALID_FILE_TYPE",
      ),
      false,
    );
  }
};

// ✅ File filter for Excel/CSV files (bulk upload)
const excelFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv", // .csv
    "application/csv", // .csv
    "text/plain", // .csv
  ];

  // Also check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [".xlsx", ".xls", ".csv"];

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type. Please upload Excel (.xlsx, .xls) or CSV (.csv) files.",
        400,
        "INVALID_FILE_TYPE",
      ),
      false,
    );
  }
};

// Upload configuration for images
const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    files: 10,
  },
});

// ✅ Upload configuration for Excel/CSV files
const excelUpload = multer({
  storage,
  fileFilter: excelFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB for Excel files
    files: 1,
  },
});

/**
 * Upload to Cloudinary
 */
exports.uploadToCloudinary = async (file, folder = "elegance") => {
  try {
    const result = await cloudinary.uploader.upload(file.buffer, {
      folder,
      resource_type: "auto",
      transformation: [{ quality: "auto:best" }, { fetch_format: "auto" }],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      size: result.bytes,
      format: result.format,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new AppError("Failed to upload image", 500, "UPLOAD_FAILED");
  }
};

/**
 * Upload multiple files to Cloudinary
 */
exports.uploadMultipleToCloudinary = async (files, folder = "elegance") => {
  try {
    const uploadPromises = files.map((file) =>
      exports.uploadToCloudinary(file, folder),
    );
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("Cloudinary multiple upload error:", error);
    throw new AppError("Failed to upload images", 500, "UPLOAD_FAILED");
  }
};

/**
 * Delete from Cloudinary
 */
exports.deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new AppError("Failed to delete image", 500, "DELETE_FAILED");
  }
};

/**
 * Delete multiple from Cloudinary
 */
exports.deleteMultipleFromCloudinary = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) return;
    const deletePromises = publicIds.map((id) =>
      exports.deleteFromCloudinary(id),
    );
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error("Cloudinary multiple delete error:", error);
    throw new AppError("Failed to delete images", 500, "DELETE_FAILED");
  }
};

// Export multer middleware
exports.upload = imageUpload; // Default upload for images

// ✅ Export Excel upload for bulk upload
exports.excelUpload = excelUpload;

/**
 * Single file upload
 */
exports.uploadSingle = (fieldName) => {
  return imageUpload.single(fieldName);
};

/**
 * Multiple file upload
 */
exports.uploadMultiple = (fieldName, maxCount) => {
  return imageUpload.array(fieldName, maxCount || 10);
};

/**
 * Fields upload
 */
exports.uploadFields = (fields) => {
  return imageUpload.fields(fields);
};

/**
 * Handle upload errors
 */
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new AppError(
          "File too large. Maximum size is 5MB.",
          400,
          "FILE_TOO_LARGE",
        ),
      );
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(
        new AppError(
          "Too many files. Maximum is 10 files.",
          400,
          "TOO_MANY_FILES",
        ),
      );
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(
        new AppError("Unexpected file field.", 400, "UNEXPECTED_FILE"),
      );
    }
    return next(
      new AppError(`Upload error: ${err.message}`, 400, "UPLOAD_ERROR"),
    );
  }

  if (err) {
    return next(err);
  }

  next();
};
