// backend/src/controllers/popupController.js

const Popup = require("../models/Popup");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const { AppError } = require("../middleware/errorHandler");

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

      // Create actual coupon in database
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

    // Update view count
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
    const popupData = req.body;

    // ✅ Parse JSON fields if sent as strings
    if (typeof popupData.primaryButton === "string") {
      popupData.primaryButton = JSON.parse(popupData.primaryButton);
    }
    if (typeof popupData.secondaryButton === "string") {
      popupData.secondaryButton = JSON.parse(popupData.secondaryButton);
    }
    if (typeof popupData.coupon === "string") {
      popupData.coupon = JSON.parse(popupData.coupon);
    }
    if (typeof popupData.targeting === "string") {
      popupData.targeting = JSON.parse(popupData.targeting);
    }
    if (typeof popupData.style === "string") {
      popupData.style = JSON.parse(popupData.style);
    }

    // Handle image upload (if any)
    if (req.file) {
      const cloudinary = require("../config/cloudinary");
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "elegance-perfumes/popups",
      });

      popupData.image = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
      popupData.useImage = true;
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
    let updates = req.body;

    const popup = await Popup.findById(id);
    if (!popup) {
      throw new AppError("Popup not found", 404, "POPUP_NOT_FOUND");
    }

    // ✅ Parse JSON fields if sent as strings
    if (typeof updates.primaryButton === "string") {
      updates.primaryButton = JSON.parse(updates.primaryButton);
    }
    if (typeof updates.secondaryButton === "string") {
      updates.secondaryButton = JSON.parse(updates.secondaryButton);
    }
    if (typeof updates.coupon === "string") {
      updates.coupon = JSON.parse(updates.coupon);
    }
    if (typeof updates.targeting === "string") {
      updates.targeting = JSON.parse(updates.targeting);
    }
    if (typeof updates.style === "string") {
      updates.style = JSON.parse(updates.style);
    }

    // Handle image upload
    if (req.file) {
      const cloudinary = require("../config/cloudinary");
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "elegance-perfumes/popups",
      });

      // Delete old image if exists
      if (popup.image?.publicId) {
        await cloudinary.uploader.destroy(popup.image.publicId);
      }

      updates.image = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      };
      updates.useImage = true;
    }

    // Remove image if useImage is false
    if (updates.useImage === false) {
      if (popup.image?.publicId) {
        const cloudinary = require("../config/cloudinary");
        await cloudinary.uploader.destroy(popup.image.publicId);
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
    if (popup.image?.publicId) {
      const cloudinary = require("../config/cloudinary");
      await cloudinary.uploader.destroy(popup.image.publicId);
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
