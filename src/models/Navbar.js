/**
 * Navbar Model
 * Dynamic navbar management
 */

const mongoose = require("mongoose");

const navItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
      maxlength: [30, "Label cannot exceed 30 characters"],
    },
    path: {
      type: String,
      required: [true, "Path is required"],
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    target: {
      type: String,
      enum: ["_self", "_blank"],
      default: "_self",
    },
    allowedRoles: {
      type: [String],
      enum: ["admin", "customer", "guest", "all"],
      default: ["customer"],
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NavbarItem",
      default: null,
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NavbarItem",
      },
    ],
    customStyles: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
navItemSchema.index({ order: 1 });
navItemSchema.index({ isActive: 1, isVisible: 1 });
navItemSchema.index({ parentId: 1 });

// Virtual for full path
navItemSchema.virtual("fullPath").get(function () {
  if (this.parentId) {
    return this.path;
  }
  return this.path;
});

// Static method to get active navbar items
navItemSchema.statics.getActiveItems = async function (role = "guest") {
  const items = await this.find({
    isActive: true,
    isVisible: true,
    parentId: null,
  })
    .populate({
      path: "children",
      match: { isActive: true, isVisible: true },
      options: { sort: { order: 1 } },
    })
    .sort({ order: 1 });

  return items.filter(
    (item) =>
      item.allowedRoles.includes(role) ||
      item.allowedRoles.includes("all") ||
      item.allowedRoles.length === 0,
  );
};

// Static method to seed default navbar items
navItemSchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  const defaults = [
    {
      label: "Home",
      path: "/",
      order: 0,
      isActive: true,
      isVisible: true,
      allowedRoles: ["admin", "customer", "guest"],
      icon: "Home",
      target: "_self",
    },
    {
      label: "Shop",
      path: "/shop",
      order: 1,
      isActive: true,
      isVisible: true,
      allowedRoles: ["admin", "customer", "guest"],
      icon: "ShoppingBag",
      target: "_self",
    },
    {
      label: "Collections",
      path: "/collections",
      order: 2,
      isActive: true,
      isVisible: true,
      allowedRoles: ["admin", "customer", "guest"],
      icon: "Grid",
      target: "_self",
    },
    {
      label: "About",
      path: "/about",
      order: 3,
      isActive: true,
      isVisible: true,
      allowedRoles: ["admin", "customer", "guest"],
      icon: "Info",
      target: "_self",
    },
    {
      label: "Contact",
      path: "/contact",
      order: 4,
      isActive: true,
      isVisible: true,
      allowedRoles: ["admin", "customer", "guest"],
      icon: "Mail",
      target: "_self",
    },
  ];

  await this.insertMany(defaults);
  console.log("✅ Default navbar items seeded");
};

// ✅ ONLY EXPORT THE MODEL - NOTHING ELSE
module.exports = mongoose.model("NavbarItem", navItemSchema);
