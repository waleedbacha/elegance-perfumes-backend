/**
 * User Controller
 * User management for admin and user operations
 */

const { AppError } = require("../middleware/errorHandler");
const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Wishlist = require("../models/Wishlist");
const Cart = require("../models/Cart");
const Notification = require("../models/Notification");
const Analytics = require("../models/Analytics");
const { USER_STATUS, USER_ROLES, MESSAGES } = require("../config/constants");
const emailService = require("../services/emailService");

// userController.js - getAllUsers

exports.getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // ✅ Exclude deactivated users by default
    // Only show deactivated if specifically requested
    if (status) {
      query.status = status;
    } else {
      // Default: exclude deactivated users
      query.status = { $ne: "deactivated" };
    }

    if (role) query.role = role;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select(
          "-password -refreshTokens -resetPasswordToken -verificationToken",
        )
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
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
 * Get single user (Admin)
 */
exports.getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -refreshTokens -resetPasswordToken -verificationToken")
      .populate("wishlist")
      .populate("reviews");

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Get user stats
    const orderStats = await Order.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" },
        },
      },
    ]);

    const reviewCount = await Review.countDocuments({ user: user._id });

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalOrders: orderStats[0]?.totalOrders || 0,
          totalSpent: orderStats[0]?.totalSpent || 0,
          averageOrderValue: orderStats[0]?.averageOrderValue || 0,
          reviewCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (Admin)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status, loyaltyTier, address } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Update allowed fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;
    if (role && Object.values(USER_ROLES).includes(role)) user.role = role;
    if (status && Object.values(USER_STATUS).includes(status))
      user.status = status;
    if (loyaltyTier) user.loyaltyTier = loyaltyTier;

    // Handle address update
    if (address) {
      if (address.isDefault) {
        // Set all other addresses to not default
        user.addresses.forEach((addr) => (addr.isDefault = false));
      }
      user.addresses.push(address);
    }

    await user.save();

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(200).json({
      success: true,
      data: { user },
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (Admin)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Soft delete - deactivate (skip validation)
    user.status = USER_STATUS.DEACTIVATED;
    user.email = `deleted_${user.email}_${Date.now()}`;
    user.phone = `deleted_${user.phone}_${Date.now()}`;

    // ✅ Save with validation bypass
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile (Authenticated user)
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -refreshTokens -resetPasswordToken -verificationToken")
      .populate("wishlist")
      .populate("reviews");

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user.id, status: "active" });

    // Get recent orders
    const recentOrders = await Order.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get notification count
    const unreadNotifications = await Notification.countDocuments({
      user: req.user.id,
      read: false,
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        cart: cart || null,
        recentOrders,
        unreadNotifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile (Authenticated user)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, dateOfBirth, gender, preferences } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences,
      };
    }

    await user.save();

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(200).json({
      success: true,
      data: { user },
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add address (Authenticated user)
 */
exports.addAddress = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      street,
      area,
      city,
      state,
      zipCode,
      country,
      landmark,
      isDefault,
      type,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Validate required fields
    if (!name || !phone || !street || !city || !state || !zipCode) {
      throw new AppError(
        "Missing required address fields",
        400,
        "MISSING_FIELDS",
      );
    }

    // If default, set all other addresses to not default
    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Add new address
    user.addresses.push({
      name,
      phone,
      street,
      area,
      city,
      state,
      zipCode,
      country: country || "Pakistan",
      landmark,
      isDefault: isDefault || false,
      type: type || "home",
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: {
        address: user.addresses[user.addresses.length - 1],
      },
      message: "Address added successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update address (Authenticated user)
 */
exports.updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      throw new AppError("Address not found", 404, "ADDRESS_NOT_FOUND");
    }

    // If setting as default, update others
    if (updates.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Update address fields
    Object.keys(updates).forEach((key) => {
      if (key !== "_id" && key !== "__v") {
        user.addresses[addressIndex][key] = updates[key];
      }
    });

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        address: user.addresses[addressIndex],
      },
      message: "Address updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete address (Authenticated user)
 */
exports.deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const addressIndex = user.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      throw new AppError("Address not found", 404, "ADDRESS_NOT_FOUND");
    }

    // Remove address
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default, set another as default
    if (
      !user.addresses.some((addr) => addr.isDefault) &&
      user.addresses.length > 0
    ) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user addresses (Authenticated user)
 */
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: {
        addresses: user.addresses,
        defaultAddress: user.defaultAddress,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics (Admin)
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, newUsers, usersByRole, topCustomers] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: USER_STATUS.ACTIVE }),
        User.getNewCustomers(30),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.getTopCustomers(10),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsers: newUsers.length,
        usersByRole,
        topCustomers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk user action (Admin)
 */
exports.bulkUserAction = async (req, res, next) => {
  try {
    const { userIds, action, value } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError("User IDs are required", 400, "MISSING_USER_IDS");
    }

    let result;
    let message;

    switch (action) {
      case "activate":
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: USER_STATUS.ACTIVE },
        );
        message = "Users activated successfully";
        break;

      case "deactivate":
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: USER_STATUS.DEACTIVATED },
        );
        message = "Users deactivated successfully";
        break;

      case "suspend":
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: USER_STATUS.SUSPENDED },
        );
        message = "Users suspended successfully";
        break;

      case "changeRole":
        if (!value || !Object.values(USER_ROLES).includes(value)) {
          throw new AppError("Invalid role", 400, "INVALID_ROLE");
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { role: value },
        );
        message = `Users role changed to ${value}`;
        break;

      default:
        throw new AppError("Invalid action", 400, "INVALID_ACTION");
    }

    res.status(200).json({
      success: true,
      data: { result },
      message,
    });
  } catch (error) {
    next(error);
  }
};
