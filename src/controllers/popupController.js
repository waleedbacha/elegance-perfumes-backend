// backend/src/controllers/popupController.js

const Popup = require("../models/Popup");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const { AppError } = require("../middleware/errorHandler");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

// ============================================
// PUBLIC - GET ACTIVE POPUP
// ============================================
exports.getActivePopup = async (req, res, next) => {
  try {
    const userId = req.user?._id || null;

    const popup = await Popup.getActivePopup(userId);

    if (!popup) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No active popup found",
      });
    }

    // Generate coupon code if auto-generate is on
    let couponCode = popup.coupon?.code;
    if (popup.coupon?.autoGenerate && !couponCode) {
      const prefix = "SAVE";
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      couponCode = `${prefix}${random}`;

      await Coupon.create({
        code: couponCode,
        name: popup.name || "Popup Discount",
        discountType: popup.coupon?.discountType || "percentage",
        discountValue: popup.coupon?.discountValue || 10,
        minOrderAmount: popup.coupon?.minOrderAmount || 0,
        validFrom: new Date(),
        validUntil: new Date(
          Date.now() +
            (popup.coupon?.expiresInDays || 30) * 24 * 60 * 60 * 1000,
        ),
        usageLimit: popup.coupon?.usageLimit || 100,
        isActive: true,
      });
    }

    await Popup.findByIdAndUpdate(popup._id, {
      $inc: { "analytics.views": 1 },
    });

    res.status(200).json({
      success: true,
      data: {
        ...popup.toObject(),
        couponCode,
      },
      message: "Popup fetched successfully",
    });
  } catch (error) {
    console.error("❌ Get popup error:", error);
    next(error);
  }
};

// ============================================
// ADMIN - GET ALL POPUPS
// ============================================
exports.getAllPopups = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [popups, total] = await Promise.all([
      Popup.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Popup.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        popups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN - GET SINGLE POPUP
// ============================================
exports.getPopup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const popup = await Popup.findById(id);
    if (!popup) {
      throw new AppError("Popup not found", 404, "POPUP_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { popup },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN - CREATE POPUP
// ============================================
exports.createPopup = async (req, res, next) => {
  try {
    // Parse data from FormData
    let popupData;
    if (req.body.data) {
      popupData =
        typeof req.body.data === "string"
          ? JSON.parse(req.body.data)
          : req.body.data;
    } else {
      popupData = req.body;
    }

    console.log("📦 Popup data:", popupData);
    console.log("📸 Files received:", req.file ? 1 : 0);

    // Parse JSON fields
    const jsonFields = [
      "primaryButton",
      "secondaryButton",
      "coupon",
      "targeting",
      "style",
    ];
    jsonFields.forEach((field) => {
      if (typeof popupData[field] === "string") {
        try {
          popupData[field] = JSON.parse(popupData[field]);
        } catch (e) {
          console.warn(`⚠️ Failed to parse ${field}:`, e.message);
        }
      }
    });

    // Handle image upload - SAME AS CATEGORY ✅
    if (req.file) {
      try {
        console.log(`📸 Uploading popup image: ${req.file.originalname}`);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        // Convert buffer to base64
        const base64Image = req.file.buffer.toString("base64");
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        // Create form data
        const form = new FormData();
        form.append("file", dataUrl);
        form.append(
          "upload_preset",
          process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes",
        );
        form.append("folder", "elegance-perfumes/popups");

        // Send to Cloudinary
        const response = await axios.post(cloudinaryUrl, form, {
          headers: { ...form.getHeaders() },
          timeout: 60000,
        });

        const result = response.data;

        if (result.error) {
          console.error("❌ Cloudinary error:", result.error);
          throw new Error(result.error.message);
        }

        popupData.image = {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        };
        popupData.useImage = true;

        console.log(`✅ Popup image uploaded: ${result.secure_url}`);
      } catch (uploadError) {
        console.error("❌ Image upload failed:", uploadError.message);
        throw new AppError(
          `Failed to upload image: ${uploadError.message}`,
          500,
          "UPLOAD_FAILED",
        );
      }
    }

    popupData.createdBy = req.user.id;

    const popup = new Popup(popupData);
    await popup.save();

    res.status(201).json({
      success: true,
      data: { popup },
      message: "Popup created successfully",
    });
  } catch (error) {
    console.error("❌ Create popup error:", error);
    next(error);
  }
};

// ============================================
// ADMIN - UPDATE POPUP
// ============================================
exports.updatePopup = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Parse data from FormData
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
    console.log("📸 Files received:", req.file ? 1 : 0);

    const popup = await Popup.findById(id);
    if (!popup) {
      throw new AppError("Popup not found", 404, "POPUP_NOT_FOUND");
    }

    // Parse JSON fields
    const jsonFields = [
      "primaryButton",
      "secondaryButton",
      "coupon",
      "targeting",
      "style",
    ];
    jsonFields.forEach((field) => {
      if (typeof updates[field] === "string") {
        try {
          updates[field] = JSON.parse(updates[field]);
        } catch (e) {
          console.warn(`⚠️ Failed to parse ${field}:`, e.message);
        }
      }
    });

    // Handle image upload - SAME AS CATEGORY ✅
    if (req.file) {
      try {
        console.log(`📸 Uploading popup image: ${req.file.originalname}`);

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

        // Delete old image if exists
        if (
          popup.image?.publicId &&
          !popup.image.publicId.startsWith("default/")
        ) {
          try {
            const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = crypto
              .createHash("sha256")
              .update(
                `public_id=${popup.image.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
              )
              .digest("hex");

            await axios.post(deleteUrl, {
              public_id: popup.image.publicId,
              timestamp: timestamp,
              signature: signature,
              api_key: process.env.CLOUDINARY_API_KEY,
            });
            console.log(`🗑️ Deleted old image: ${popup.image.publicId}`);
          } catch (deleteError) {
            console.error(
              "❌ Failed to delete old image:",
              deleteError.message,
            );
          }
        }

        // Upload new image
        const base64Image = req.file.buffer.toString("base64");
        const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const form = new FormData();
        form.append("file", dataUrl);
        form.append(
          "upload_preset",
          process.env.CLOUDINARY_UPLOAD_PRESET || "elegance_perfumes",
        );
        form.append("folder", "elegance-perfumes/popups");

        const response = await axios.post(cloudinaryUrl, form, {
          headers: { ...form.getHeaders() },
          timeout: 60000,
        });

        const result = response.data;

        if (result.error) {
          console.error("❌ Cloudinary error:", result.error);
          throw new Error(result.error.message);
        }

        updates.image = {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        };
        updates.useImage = true;

        console.log(`✅ Popup image uploaded: ${result.secure_url}`);
      } catch (uploadError) {
        console.error("❌ Image upload failed:", uploadError.message);
        throw new AppError(
          `Failed to upload image: ${uploadError.message}`,
          500,
          "UPLOAD_FAILED",
        );
      }
    }

    // Remove image if useImage is false
    if (updates.useImage === false) {
      if (
        popup.image?.publicId &&
        !popup.image.publicId.startsWith("default/")
      ) {
        try {
          const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
          const timestamp = Math.floor(Date.now() / 1000);
          const signature = crypto
            .createHash("sha256")
            .update(
              `public_id=${popup.image.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
            )
            .digest("hex");

          await axios.post(deleteUrl, {
            public_id: popup.image.publicId,
            timestamp: timestamp,
            signature: signature,
            api_key: process.env.CLOUDINARY_API_KEY,
          });
          console.log(`🗑️ Deleted image: ${popup.image.publicId}`);
        } catch (deleteError) {
          console.error("❌ Failed to delete image:", deleteError.message);
        }
      }
      updates.image = { url: "", publicId: "" };
    }

    updates.updatedBy = req.user.id;
    Object.assign(popup, updates);
    await popup.save();

    res.status(200).json({
      success: true,
      data: { popup },
      message: "Popup updated successfully",
    });
  } catch (error) {
    console.error("❌ Update popup error:", error);
    next(error);
  }
};

// ============================================
// ADMIN - DELETE POPUP
// ============================================
exports.deletePopup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const popup = await Popup.findById(id);
    if (!popup) {
      throw new AppError("Popup not found", 404, "POPUP_NOT_FOUND");
    }

    // Delete image from Cloudinary
    if (popup.image?.publicId && !popup.image.publicId.startsWith("default/")) {
      try {
        const deleteUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`;
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = crypto
          .createHash("sha256")
          .update(
            `public_id=${popup.image.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`,
          )
          .digest("hex");

        await axios.post(deleteUrl, {
          public_id: popup.image.publicId,
          timestamp: timestamp,
          signature: signature,
          api_key: process.env.CLOUDINARY_API_KEY,
        });
        console.log(`🗑️ Deleted image: ${popup.image.publicId}`);
      } catch (deleteError) {
        console.error("❌ Failed to delete image:", deleteError.message);
      }
    }

    await popup.deleteOne();

    res.status(200).json({
      success: true,
      message: "Popup deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN - TOGGLE POPUP STATUS
// ============================================
exports.togglePopupStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const popup = await Popup.findById(id);
    if (!popup) {
      throw new AppError("Popup not found", 404, "POPUP_NOT_FOUND");
    }

    popup.status = popup.status === "active" ? "inactive" : "active";
    await popup.save();

    res.status(200).json({
      success: true,
      data: { popup },
      message: `Popup ${popup.status === "active" ? "activated" : "deactivated"}`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN - GET POPUP STATS
// ============================================
exports.getPopupStats = async (req, res, next) => {
  try {
    const stats = await Popup.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalViews: { $sum: "$analytics.views" },
          totalClicks: { $sum: "$analytics.clicks" },
          totalConversions: { $sum: "$analytics.conversions" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PUBLIC - RECORD POPUP CLICK
// ============================================
exports.recordPopupClick = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Popup.findByIdAndUpdate(id, {
      $inc: { "analytics.clicks": 1 },
    });

    res.status(200).json({
      success: true,
      message: "Click recorded",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PUBLIC - RECORD POPUP CONVERSION
// ============================================
exports.recordPopupConversion = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Popup.findByIdAndUpdate(id, {
      $inc: { "analytics.conversions": 1 },
    });

    res.status(200).json({
      success: true,
      message: "Conversion recorded",
    });
  } catch (error) {
    next(error);
  }
};
