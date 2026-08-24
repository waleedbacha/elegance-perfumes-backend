// backend/src/models/Popup.js

const mongoose = require("mongoose");

const popupSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================
    name: {
      type: String,
      required: [true, "Popup name is required"],
      trim: true,
      maxlength: [100, "Name must not exceed 100 characters"],
    },
    title: {
      type: String,
      required: [true, "Popup title is required"],
      trim: true,
      maxlength: [100, "Title must not exceed 100 characters"],
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: [200, "Subtitle must not exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must not exceed 500 characters"],
    },

    // ==========================================
    // MEDIA (OPTIONAL)
    // ==========================================
    image: {
      url: {
        type: String,
        default: "",
      },
      publicId: String,
      alt: String,
      width: Number,
      height: Number,
    },
    useImage: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // BUTTONS
    // ==========================================
    primaryButton: {
      text: {
        type: String,
        default: "Shop Now",
      },
      url: {
        type: String,
        default: "/shop",
      },
      openInNewTab: {
        type: Boolean,
        default: false,
      },
    },
    secondaryButton: {
      text: {
        type: String,
        default: "Maybe Later",
      },
      show: {
        type: Boolean,
        default: true,
      },
    },

    // ==========================================
    // COUPON
    // ==========================================
    coupon: {
      code: {
        type: String,
        default: "",
      },
      autoGenerate: {
        type: Boolean,
        default: true,
      },
      discountValue: {
        type: Number,
        default: 10,
      },
      discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
      minOrderAmount: {
        type: Number,
        default: 0,
      },
      usageLimit: {
        type: Number,
        default: 100,
      },
      expiresInDays: {
        type: Number,
        default: 30,
      },
    },

    // ==========================================
    // TRIGGER & DELAY
    // ==========================================
    triggerDelay: {
      type: Number,
      default: 5000, // milliseconds
      min: 1000,
      max: 30000,
    },
    triggerType: {
      type: String,
      enum: ["delay", "scroll", "exit-intent", "on-click"],
      default: "delay",
    },

    // ==========================================
    // TARGETING
    // ==========================================
    targeting: {
      // Show to new users only (never placed an order)
      newUsersOnly: {
        type: Boolean,
        default: true,
      },
      // Show to returning users (have placed at least one order)
      returningUsers: {
        type: Boolean,
        default: false,
      },
      // Specific user segments
      userSegments: {
        type: [String],
        enum: ["all", "new-users", "returning-users", "premium-users"],
        default: ["all"],
      },
      // Show only on specific pages
      pages: {
        type: [String],
        default: ["homepage", "shop", "collections"],
      },
    },

    // ==========================================
    // FREQUENCY & DISMISS
    // ==========================================
    frequency: {
      type: String,
      enum: ["once", "daily", "weekly", "monthly", "always"],
      default: "once",
    },
    dismissible: {
      type: Boolean,
      default: true,
    },
    showCloseButton: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // SCHEDULING
    // ==========================================
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    scheduleType: {
      type: String,
      enum: ["always", "scheduled"],
      default: "always",
    },

    // ==========================================
    // STATUS
    // ==========================================
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled", "expired"],
      default: "inactive",
    },

    // ==========================================
    // STYLING
    // ==========================================
    style: {
      backgroundColor: {
        type: String,
        default: "#1a1a1a",
      },
      textColor: {
        type: String,
        default: "#ffffff",
      },
      accentColor: {
        type: String,
        default: "#8b0000",
      },
      buttonColor: {
        type: String,
        default: "#8b0000",
      },
      buttonTextColor: {
        type: String,
        default: "#ffffff",
      },
      borderRadius: {
        type: String,
        default: "16px",
      },
      size: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
      position: {
        type: String,
        enum: ["center", "bottom-right", "bottom-left"],
        default: "center",
      },
    },

    // ==========================================
    // PRIORITY
    // ==========================================
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ==========================================
    // ANALYTICS
    // ==========================================
    analytics: {
      views: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      conversions: {
        type: Number,
        default: 0,
      },
    },

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ==========================================
// INDEXES
// ==========================================
popupSchema.index({ status: 1, startDate: 1, endDate: 1 });
popupSchema.index({ priority: -1, status: 1 });
popupSchema.index({ "targeting.newUsersOnly": 1, status: 1 });

// ==========================================
// VIRTUALS
// ==========================================
popupSchema.virtual("isActive").get(function () {
  if (this.status !== "active") return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
});

// ==========================================
// STATIC METHODS
// ==========================================
popupSchema.statics.getActivePopup = async function (userId = null) {
  const now = new Date();

  // Base query for active popups
  const query = {
    status: "active",
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $gte: now } }],
  };

  const popups = await this.find(query).sort({ priority: -1 });

  // If no user, check if newUsersOnly is false
  if (!userId) {
    return popups.find((p) => !p.targeting.newUsersOnly) || popups[0] || null;
  }

  // Check user's order history
  const Order = require("./Order");
  const userOrders = await Order.findOne({ user: userId });

  const hasOrdered = !!userOrders;

  // Find appropriate popup
  for (const popup of popups) {
    // Check new users only
    if (popup.targeting.newUsersOnly && hasOrdered) continue;
    if (popup.targeting.returningUsers && !hasOrdered) continue;

    return popup;
  }

  return popups[0] || null;
};

module.exports = mongoose.model("Popup", popupSchema);
