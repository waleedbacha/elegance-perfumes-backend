/**
 * Review Controller
 * Product reviews and ratings management
 */

const { AppError } = require("../middleware/errorHandler");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Analytics = require("../models/Analytics");
const { MESSAGES } = require("../config/constants");

/**
 * Create review - FIXED (No auto-approval)
 */
/**
 * Create review - ONLY FOR PURCHASED PRODUCTS
 */
exports.createReview = async (req, res, next) => {
  try {
    const { productId, rating, title, comment, pros, cons } = req.body;

    console.log("📝 Creating review...");
    console.log("📝 Files received:", req.files?.length || 0);

    // Validate required fields
    if (!productId || !rating || !comment) {
      throw new AppError(
        "Product ID, rating, and comment are required",
        400,
        "MISSING_FIELDS",
      );
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    // ✅ ✅ ✅ CHECK IF USER PURCHASED THIS PRODUCT - FIXED
    const order = await Order.findOne({
      user: req.user.id,
      "items.product": productId,
      status: { $in: ["delivered", "completed"] },
    });

    // ✅ BLOCK REVIEW IF USER NEVER PURCHASED
    if (!order) {
      throw new AppError(
        "You can only review products you have purchased",
        403,
        "MUST_PURCHASE_FIRST",
      );
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
    });

    if (existingReview) {
      throw new AppError(
        "You have already reviewed this product",
        409,
        "REVIEW_EXISTS",
      );
    }

    // Get user for notification
    const user = await User.findById(req.user.id);

    // ==========================================
    // ✅ HANDLE IMAGE UPLOADS
    // ==========================================
    const images = [];
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} review images...`);

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
          form.append("folder", "elegance-perfumes/reviews");

          const response = await axios.post(cloudinaryUrl, form, {
            headers: {
              ...form.getHeaders(),
            },
            timeout: 60000,
          });

          const result = response.data;

          if (result.error) {
            console.error("❌ Cloudinary error:", result.error);
            throw new Error(result.error.message);
          }

          images.push({
            url: result.secure_url,
            publicId: result.public_id,
            alt: `Review image ${i + 1}`,
          });

          console.log(
            `✅ Review image ${i + 1} uploaded: ${result.secure_url}`,
          );
        } catch (uploadError) {
          console.error(
            `❌ Failed to upload review image ${i + 1}:`,
            uploadError.message,
          );
        }
      }
    }

    console.log(`📸 Final images count: ${images.length}`);

    // ✅ Create review with images
    const review = new Review({
      user: req.user.id,
      product: productId,
      rating: parseInt(rating),
      title,
      comment,
      pros: pros ? (typeof pros === "string" ? pros.split(",") : pros) : [],
      cons: cons ? (typeof cons === "string" ? cons.split(",") : cons) : [],
      images: images,
      verified: !!order, // ✅ Set verified based on order
      order: order?._id,
      approved: false,
      status: "pending",
    });

    await review.save();

    // Send notification to admin
    await Notification.create({
      user: req.user.id,
      type: "review",
      subtype: "review-request",
      title: "New Review Pending Approval",
      message: `${user.name} reviewed "${product.name}" and needs approval`,
      data: {
        productId: product._id,
        productName: product.name,
        reviewId: review._id,
        rating: review.rating,
        hasImages: images.length > 0,
        verified: review.verified,
      },
      action: {
        label: "Review & Approve",
        url: `/admin/reviews/${review._id}`,
      },
      priority: "high",
    });

    res.status(201).json({
      success: true,
      data: { review },
      message: "Review submitted successfully and is pending approval",
    });
  } catch (error) {
    console.error("❌ Create review error:", error);
    next(error);
  }
};

/**
 * Get product reviews - COMPLETE FIX
 */
/**
 * Get product reviews - WITH IMAGES
 */
exports.getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Build query - Only show approved reviews
    const query = {
      product: productId,
      approved: true,
      status: "approved",
    };
    if (rating) query.rating = parseInt(rating);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ✅ GET REVIEWS WITH IMAGES INCLUDED
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate({
          path: "user",
          select: "name email profilePicture",
        })
        .select(
          "rating title comment createdAt user verified adminResponse images",
        ) // ✅ Make sure 'images' is here
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments(query),
    ]);

    // Get review stats
    const stats = await Review.getProductStats(productId);

    // Ensure user.name is set
    const reviewsWithUser = reviews.map((review) => ({
      ...review,
      user: review.user
        ? {
            ...review.user,
            name: review.user.name || "Anonymous",
          }
        : { name: "Anonymous", email: "N/A" },
    }));

    console.log(`📸 Reviews found: ${reviewsWithUser.length}`);
    console.log(
      `📸 Reviews with images: ${reviewsWithUser.filter((r) => r.images && r.images.length > 0).length}`,
    );

    res.status(200).json({
      success: true,
      data: {
        reviews: reviewsWithUser,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasNext:
            (parseInt(page) - 1) * parseInt(limit) + parseInt(limit) < total,
          hasPrev: parseInt(page) > 1,
        },
        stats,
        product: {
          id: product._id,
          name: product.name,
          rating: product.ratings?.average || 0,
          totalReviews: product.ratings?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get product reviews error:", error);
    next(error);
  }
};
/**
 * Get user reviews
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await Review.getProductReviews(null, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      includeUnapproved: true,
    });

    // Modify to filter by user
    const query = { user: req.user.id };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("product", "name brand price images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
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

/**
 * Update review
 */
exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, title, comment, pros, cons } = req.body;

    const review = await Review.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    // Update fields
    if (rating) review.rating = parseInt(rating);
    if (title) review.title = title;
    if (comment) review.comment = comment;
    if (pros) review.pros = typeof pros === "string" ? pros.split(",") : pros;
    if (cons) review.cons = typeof cons === "string" ? cons.split(",") : cons;

    // Reset approval status
    review.approved = false;
    review.status = "pending";

    await review.save();

    // Update product ratings
    await review.updateProductRatings();

    res.status(200).json({
      success: true,
      data: { review },
      message: "Review updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    await review.deleteOne();

    // Update product ratings
    await review.updateProductRatings();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark review helpful
 */
exports.markHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    await review.markHelpful(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        helpfulCount: review.helpful.count,
        isHelpful: review.helpful.users.includes(req.user.id),
      },
      message: "Helpful mark updated",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark review not helpful
 */
exports.markNotHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    await review.markNotHelpful(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        notHelpfulCount: review.notHelpful.count,
        isNotHelpful: review.notHelpful.users.includes(req.user.id),
      },
      message: "Not helpful mark updated",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN REVIEW CONTROLLERS
// ==========================================

/**
 * Get all reviews (Admin)
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      rating,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (rating) query.rating = parseInt(rating);
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("user", "name email")
        .populate("product", "name brand price")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reviews,
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

/**
 * Get review details (Admin)
 */
exports.getReviewDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate("user", "name email phone")
      .populate("product", "name brand price images")
      .populate("order", "orderNumber");

    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve review (Admin) - FIXED
 */
exports.approveReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    // ✅ Update review status
    review.approved = true;
    review.status = "approved";
    review.updatedAt = new Date();
    await review.save();

    // ✅ Update product ratings
    await review.updateProductRatings();

    // Notify user
    await Notification.create({
      user: review.user,
      type: "review",
      subtype: "review-approved",
      title: "Your Review is Live!",
      message:
        "Your review has been approved and is now visible on the product page.",
      data: {
        reviewId: review._id,
        productId: review.product,
      },
      action: {
        label: "View Review",
        url: `/product/${review.product}`,
      },
    });

    res.status(200).json({
      success: true,
      data: { review },
      message: "Review approved successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject review (Admin)
 */
exports.rejectReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    await review.reject(reason);

    res.status(200).json({
      success: true,
      data: { review },
      message: "Review rejected",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin response to review
 */
exports.adminRespond = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      throw new AppError("Response text is required", 400, "MISSING_RESPONSE");
    }

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    review.adminResponse = {
      text: response,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await review.save();

    // Notify user
    await Notification.create({
      user: review.user,
      type: "review",
      subtype: "review-response",
      title: "Admin Responded to Your Review",
      message: `Admin responded to your review: "${response}"`,
      data: {
        reviewId: review._id,
        productId: review.product,
      },
      action: {
        label: "View Response",
        url: `/product/${review.product}`,
      },
    });

    res.status(200).json({
      success: true,
      data: { review },
      message: "Admin response added",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete review (Admin)
 */
exports.deleteReviewAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    }

    await review.deleteOne();

    // Update product ratings
    await review.updateProductRatings();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get review analytics (Admin)
 */
exports.getReviewAnalytics = async (req, res, next) => {
  try {
    const { period = "30d" } = req.query;

    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const stats = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          approved: true,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          ratingDistribution: {
            1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
          verifiedReviews: { $sum: { $cond: ["$verified", 1, 0] } },
          totalHelpful: { $sum: "$helpful.count" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedReviews: 0,
        totalHelpful: 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
