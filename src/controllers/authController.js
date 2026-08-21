/**
 * Auth Controller
 * Authentication and authorization management
 */

const { AppError } = require("../middleware/errorHandler");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const ScentProfile = require("../models/ScentProfile");
const jwtUtils = require("../utils/jwt");
const bcryptUtils = require("../utils/bcrypt");
const emailService = require("../services/emailService");
const smsService = require("../services/smsService");
const { MESSAGES, USER_STATUS } = require("../config/constants");

/**
 * Register new user
 */
/**
 * Register new user
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, passwordConfirm } = req.body;

    // Validate password confirmation
    if (password !== passwordConfirm) {
      throw new AppError("Passwords do not match", 400, "PASSWORD_MISMATCH");
    }

    // Validate password strength
    const passwordValidation = bcryptUtils.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(
        passwordValidation.errors.join(". "),
        400,
        "WEAK_PASSWORD",
      );
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email.toLowerCase() ? "Email" : "Phone";
      throw new AppError(`${field} already registered`, 409, "USER_EXISTS");
    }

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password,
    });

    await user.save();

    // Generate verification token (keep this for email verification if needed)
    const verificationToken = jwtUtils.generateEmailToken(user._id);
    user.verificationToken = verificationToken;
    user.verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Create cart
    await Cart.getOrCreateCart(user._id, true);

    // Create wishlist
    const wishlist = new Wishlist({ user: user._id });
    await wishlist.save();

    // Create scent profile
    const scentProfile = new ScentProfile({ user: user._id });
    await scentProfile.save();

    // ✅ SEND WELCOME EMAIL ONLY (NO VERIFICATION EMAIL)
    try {
      await emailService.sendWelcomeEmail(user);
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error("❌ Welcome email failed:", error.message);
      // Don't fail registration if email fails
    }

    // Send welcome SMS
    try {
      await smsService.sendWelcomeSMS(user.phone, user.name);
    } catch (error) {
      console.error("Welcome SMS failed:", error.message);
    }

    // Generate tokens
    const token = jwtUtils.generateToken({ id: user._id, role: user.role });
    const refreshToken = jwtUtils.generateRefreshToken({ id: user._id });

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;
    user.verificationToken = undefined;

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        refreshToken,
      },
      message: "Registration successful! Check your email for welcome message.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: email?.toLowerCase() }, { phone }],
    }).select("+password +loginAttempts +lockedUntil");

    if (!user) {
      throw new AppError(
        MESSAGES.INVALID_CREDENTIALS,
        401,
        "INVALID_CREDENTIALS",
      );
    }

    // Check if account is locked
    if (user.isLocked()) {
      const remaining = user.getLockTimeRemaining();
      throw new AppError(
        `Account locked. Please try again in ${remaining} minutes`,
        401,
        "ACCOUNT_LOCKED",
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();

      // ✅ Check if account should be locked
      const remainingAttempts = 5 - (user.loginAttempts || 0);
      const errorMessage =
        remainingAttempts > 0
          ? `${MESSAGES.INVALID_CREDENTIALS}. ${remainingAttempts} attempts remaining.`
          : MESSAGES.INVALID_CREDENTIALS;

      throw new AppError(errorMessage, 401, "INVALID_CREDENTIALS");
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    user.lastIPAddress = req.ip;
    user.lastUserAgent = req.headers["user-agent"];
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = jwtUtils.generateToken({ id: user._id, role: user.role });
    const refreshToken = jwtUtils.generateRefreshToken({ id: user._id });

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(200).json({
      success: true,
      data: {
        user,
        token,
        refreshToken,
      },
      message: MESSAGES.LOGIN_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken && req.user) {
      // Remove refresh token
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    // Clear cookie if used
    res.clearCookie("token");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: MESSAGES.LOGOUT_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(
        "Refresh token required",
        400,
        "REFRESH_TOKEN_REQUIRED",
      );
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwtUtils.verifyToken(refreshToken);
    } catch (error) {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.id,
      "refreshTokens.token": refreshToken,
      "refreshTokens.expiresAt": { $gt: new Date() },
    });

    if (!user) {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    // Generate new tokens
    const newToken = jwtUtils.generateToken({ id: user._id, role: user.role });
    const newRefreshToken = jwtUtils.generateRefreshToken({ id: user._id });

    // Update refresh tokens
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: { token: refreshToken } },
      $push: {
        refreshTokens: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Verification token required", 400, "TOKEN_REQUIRED");
    }

    // Verify token
    let decoded;
    try {
      decoded = jwtUtils.verifyEmailToken(token);
    } catch (error) {
      throw new AppError(
        "Invalid or expired verification token",
        400,
        "INVALID_TOKEN",
      );
    }

    // Find user
    const user = await User.findOne({
      _id: decoded.id,
      verificationToken: token,
      verificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError(
        "Invalid or expired verification token",
        400,
        "INVALID_TOKEN",
      );
    }

    // Verify user
    user.emailVerified = true;
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: MESSAGES.EMAIL_VERIFIED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists
      res.status(200).json({
        success: true,
        message: MESSAGES.PASSWORD_RESET_SENT,
      });
      return;
    }

    // Generate reset token
    const resetToken = jwtUtils.generateResetToken(user._id);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      console.error("Password reset email failed:", error.message);
      throw new AppError("Failed to send reset email", 500, "EMAIL_FAILED");
    }

    res.status(200).json({
      success: true,
      message: MESSAGES.PASSWORD_RESET_SENT,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;

    if (!token) {
      throw new AppError("Reset token required", 400, "TOKEN_REQUIRED");
    }

    if (password !== passwordConfirm) {
      throw new AppError("Passwords do not match", 400, "PASSWORD_MISMATCH");
    }

    // Validate password strength
    const passwordValidation = bcryptUtils.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new AppError(
        passwordValidation.errors.join(". "),
        400,
        "WEAK_PASSWORD",
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwtUtils.verifyResetToken(token);
    } catch (error) {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        "INVALID_TOKEN",
      );
    }

    // Find user
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        "INVALID_TOKEN",
      );
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.lastPasswordChange = new Date();
    await user.save();

    // Send confirmation
    try {
      await emailService.sendPasswordChangedEmail(user);
    } catch (error) {
      console.error("Password changed email failed:", error.message);
    }

    res.status(200).json({
      success: true,
      message: MESSAGES.PASSWORD_RESET_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password (authenticated)
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      throw new AppError(
        "All password fields are required",
        400,
        "MISSING_FIELDS",
      );
    }

    if (newPassword !== newPasswordConfirm) {
      throw new AppError(
        "New passwords do not match",
        400,
        "PASSWORD_MISMATCH",
      );
    }

    // Validate password strength
    const passwordValidation =
      bcryptUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(
        passwordValidation.errors.join(". "),
        400,
        "WEAK_PASSWORD",
      );
    }

    // Get user with password
    const user = await User.findById(req.user.id).select("+password");

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError(
        "Current password is incorrect",
        401,
        "INVALID_PASSWORD",
      );
    }

    // Update password
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    // Send confirmation
    try {
      await emailService.sendPasswordChangedEmail(user);
    } catch (error) {
      console.error("Password changed email failed:", error.message);
    }

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
exports.getMe = async (req, res, next) => {
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

    res.status(200).json({
      success: true,
      data: {
        user,
        cart: cart || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
exports.updateMe = async (req, res, next) => {
  try {
    const { name, phone, dateOfBirth, gender } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Update allowed fields - handle empty values properly
    if (name !== undefined && name !== null && name !== "") {
      user.name = name;
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      user.phone = phone;
    }

    // Handle dateOfBirth - allow null/empty
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === "" || dateOfBirth === null) {
        user.dateOfBirth = null;
      } else {
        const date = new Date(dateOfBirth);
        if (!isNaN(date.getTime())) {
          user.dateOfBirth = date;
        }
      }
    }

    // Handle gender - allow empty string
    if (gender !== undefined) {
      if (gender === "") {
        user.gender = undefined;
      } else {
        user.gender = gender;
      }
    }

    await user.save();

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(200).json({
      success: true,
      data: {
        user,
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete account
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      throw new AppError(
        "Password is required to delete account",
        400,
        "PASSWORD_REQUIRED",
      );
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError("Invalid password", 401, "INVALID_PASSWORD");
    }

    // Soft delete - deactivate account
    user.status = USER_STATUS.DEACTIVATED;
    user.phone = `deleted_${user.phone}_${Date.now()}`;
    user.email = `deleted_${user.email}_${Date.now()}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 */
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (user.emailVerified) {
      throw new AppError("Email already verified", 400, "ALREADY_VERIFIED");
    }

    // Generate new verification token
    const verificationToken = jwtUtils.generateEmailToken(user._id);
    user.verificationToken = verificationToken;
    user.verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user, verificationToken);
    } catch (error) {
      console.error("Verification email failed:", error.message);
      throw new AppError(
        "Failed to send verification email",
        500,
        "EMAIL_FAILED",
      );
    }

    res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Google OAuth Login/Register
 */
/**
 * Google OAuth Login/Register - Fixed for phone validation
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError(
        "Google authorization code is required",
        400,
        "GOOGLE_CODE_REQUIRED",
      );
    }

    console.log("🔑 Google code received:", code.substring(0, 30) + "...");

    // ✅ Check if client secret is configured
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      console.error("❌ GOOGLE_CLIENT_SECRET is not set in .env file!");
      throw new AppError(
        "Google OAuth is not configured properly",
        500,
        "GOOGLE_CONFIG_MISSING",
      );
    }

    // ✅ Exchange code for tokens
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "postmessage",
    );

    // ✅ Exchange the code for tokens
    let tokens;
    try {
      const response = await client.getToken(code);
      tokens = response.tokens;
      console.log("✅ Tokens received from Google");
    } catch (tokenError) {
      console.error(
        "❌ Token exchange error:",
        tokenError.response?.data || tokenError.message,
      );
      throw new AppError(
        "Failed to exchange authorization code: " +
          (tokenError.message || "Unknown error"),
        400,
        "TOKEN_EXCHANGE_FAILED",
      );
    }

    // ✅ Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      throw new AppError(
        "Email not provided by Google",
        400,
        "GOOGLE_EMAIL_MISSING",
      );
    }

    console.log("✅ Google user verified:", email);

    // ✅ Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // ✅ Create new user - phone is NOT required for Google users
      user = new User({
        name: name || "Google User",
        email: email.toLowerCase(),
        phone: null, // ✅ Set phone to null (optional)
        password: await bcryptUtils.hashPassword(
          googleId + process.env.JWT_SECRET,
        ),
        isVerified: true,
        emailVerified: true,
        profilePicture: {
          url: picture || "",
          publicId: "google",
        },
        // ✅ Skip phone validation for Google users
      });

      await user.save();
      console.log("✅ New user created:", email);

      // Create cart
      await Cart.getOrCreateCart(user._id, true);

      // Create wishlist
      const wishlist = new Wishlist({ user: user._id });
      await wishlist.save();

      // Create scent profile
      const scentProfile = new ScentProfile({ user: user._id });
      await scentProfile.save();
    } else {
      console.log("✅ Existing user found:", email);
      // Update user's last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
    }

    // ✅ Generate tokens
    const jwtToken = jwtUtils.generateToken({ id: user._id, role: user.role });
    const refreshToken = jwtUtils.generateRefreshToken({ id: user._id });

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(200).json({
      success: true,
      data: {
        user,
        token: jwtToken,
        refreshToken,
      },
      message: "Google login successful",
    });
  } catch (error) {
    console.error("❌ Google auth error:", error);
    next(error);
  }
};

/**
 * Facebook OAuth Login/Register - Fixed for phone validation
 */
exports.facebookAuth = async (req, res, next) => {
  try {
    const { accessToken, userID } = req.body;

    if (!accessToken || !userID) {
      throw new AppError(
        "Facebook access token and user ID are required",
        400,
        "FACEBOOK_TOKEN_REQUIRED",
      );
    }

    // ✅ Verify Facebook token
    const axios = require("axios");
    const fbResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${userID}?fields=id,name,email,picture&access_token=${accessToken}`,
    );

    const { id: fbId, name, email, picture } = fbResponse.data;

    if (!email) {
      throw new AppError(
        "Email not provided by Facebook",
        400,
        "FACEBOOK_EMAIL_MISSING",
      );
    }

    // ✅ Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // ✅ Create new user - phone is NOT required for Facebook users
      user = new User({
        name: name || "Facebook User",
        email: email.toLowerCase(),
        phone: null, // ✅ Set phone to null (optional)
        password: await bcryptUtils.hashPassword(fbId + process.env.JWT_SECRET),
        isVerified: true,
        emailVerified: true,
        profilePicture: {
          url: picture?.data?.url || "",
          publicId: "facebook",
        },
      });

      await user.save();

      // Create cart
      await Cart.getOrCreateCart(user._id, true);

      // Create wishlist
      const wishlist = new Wishlist({ user: user._id });
      await wishlist.save();

      // Create scent profile
      const scentProfile = new ScentProfile({ user: user._id });
      await scentProfile.save();
    }

    // ✅ Generate tokens
    const jwtToken = jwtUtils.generateToken({ id: user._id, role: user.role });
    const refreshToken = jwtUtils.generateRefreshToken({ id: user._id });

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(200).json({
      success: true,
      data: {
        user,
        token: jwtToken,
        refreshToken,
      },
      message: "Facebook login successful",
    });
  } catch (error) {
    console.error("❌ Facebook auth error:", error);
    next(error);
  }
};
