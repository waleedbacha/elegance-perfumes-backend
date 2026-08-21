/**
 * Navbar Controller
 * Complete navbar management
 */

const { AppError } = require("../middleware/errorHandler");
const NavbarItem = require("../models/Navbar");

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * Get active navbar items
 */
exports.getNavbar = async (req, res, next) => {
  try {
    const role = req.user?.role || "guest";
    const items = await NavbarItem.getActiveItems(role);

    res.status(200).json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * Get all navbar items (Admin)
 */
exports.getAllNavbarItems = async (req, res, next) => {
  try {
    const items = await NavbarItem.find()
      .populate({
        path: "children",
        options: { sort: { order: 1 } },
      })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single navbar item (Admin)
 */
exports.getNavbarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await NavbarItem.findById(id).populate("children");

    if (!item) {
      throw new AppError("Navbar item not found", 404, "NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: { item },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create navbar item (Admin)
 */
exports.createNavbarItem = async (req, res, next) => {
  try {
    console.log("📥 Creating navbar item with data:", req.body);

    const {
      label,
      path,
      icon,
      order,
      target,
      allowedRoles,
      isVisible,
      parentId,
      customStyles,
    } = req.body;

    // Validate required fields
    if (!label || !path) {
      throw new AppError("Label and path are required", 400, "MISSING_FIELDS");
    }

    // Check if path already exists
    const existing = await NavbarItem.findOne({ path });
    if (existing) {
      throw new AppError("Path already exists", 409, "PATH_EXISTS");
    }

    // ✅ Handle parentId - convert null/empty to null
    let finalParentId = null;
    if (parentId && parentId !== "null" && parentId !== "") {
      // Check if it's a valid ObjectId
      const isValidId = /^[0-9a-fA-F]{24}$/.test(parentId);
      if (isValidId) {
        const parent = await NavbarItem.findById(parentId);
        if (parent) {
          finalParentId = parentId;
        }
      }
    }

    // Handle allowedRoles
    let roles = ["customer"];
    if (allowedRoles) {
      if (typeof allowedRoles === "string") {
        roles = allowedRoles
          .split(",")
          .map((r) => r.trim())
          .filter((r) => r);
      } else if (Array.isArray(allowedRoles)) {
        roles = allowedRoles.filter((r) => r);
      }
      if (roles.length === 0) {
        roles = ["customer"];
      }
    }

    const item = new NavbarItem({
      label,
      path,
      icon: icon || "",
      order: order || 0,
      target: target || "_self",
      allowedRoles: roles,
      isVisible: isVisible !== undefined ? isVisible : true,
      parentId: finalParentId,
      customStyles: customStyles || {},
    });

    await item.save();

    // If parentId exists, add to parent's children array
    if (finalParentId) {
      await NavbarItem.findByIdAndUpdate(finalParentId, {
        $push: { children: item._id },
      });
    }

    res.status(201).json({
      success: true,
      data: { item },
      message: "Navbar item created successfully",
    });
  } catch (error) {
    console.error("❌ Create navbar error:", error);
    next(error);
  }
};

/**
 * Update navbar item (Admin)
 */
exports.updateNavbarItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      label,
      path,
      icon,
      order,
      isActive,
      target,
      allowedRoles,
      isVisible,
      parentId,
      customStyles,
    } = req.body;

    const item = await NavbarItem.findById(id);
    if (!item) {
      throw new AppError("Navbar item not found", 404, "NOT_FOUND");
    }

    // Check if path already exists (excluding current item)
    if (path && path !== item.path) {
      const existing = await NavbarItem.findOne({ path, _id: { $ne: id } });
      if (existing) {
        throw new AppError("Path already exists", 409, "PATH_EXISTS");
      }
    }

    // If parentId is changing, update parent relationships
    if (parentId !== undefined && parentId !== item.parentId) {
      // Remove from old parent
      if (item.parentId) {
        await NavbarItem.findByIdAndUpdate(item.parentId, {
          $pull: { children: item._id },
        });
      }

      // Add to new parent
      if (parentId) {
        const parent = await NavbarItem.findById(parentId);
        if (!parent) {
          throw new AppError("Parent item not found", 404, "PARENT_NOT_FOUND");
        }
        await NavbarItem.findByIdAndUpdate(parentId, {
          $push: { children: item._id },
        });
      }
    }

    // ✅ Handle allowedRoles - could be string or array
    if (allowedRoles !== undefined) {
      let roles = ["customer"]; // Default
      if (typeof allowedRoles === "string") {
        roles = allowedRoles
          .split(",")
          .map((r) => r.trim())
          .filter((r) => r);
      } else if (Array.isArray(allowedRoles)) {
        roles = allowedRoles;
      }
      if (roles.length > 0) {
        item.allowedRoles = roles;
      }
    }

    // Update fields
    if (label) item.label = label;
    if (path) item.path = path;
    if (icon !== undefined) item.icon = icon || "";
    if (order !== undefined) item.order = order;
    if (isActive !== undefined) item.isActive = isActive;
    if (target) item.target = target;
    if (isVisible !== undefined) item.isVisible = isVisible;
    if (parentId !== undefined) item.parentId = parentId || null;
    if (customStyles) item.customStyles = customStyles;

    await item.save();

    res.status(200).json({
      success: true,
      data: { item },
      message: "Navbar item updated successfully",
    });
  } catch (error) {
    console.error("❌ Update navbar error:", error);
    next(error);
  }
};

/**
 * Delete navbar item (Admin)
 */
exports.deleteNavbarItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await NavbarItem.findById(id);
    if (!item) {
      throw new AppError("Navbar item not found", 404, "NOT_FOUND");
    }

    // Remove from parent's children array
    if (item.parentId) {
      await NavbarItem.findByIdAndUpdate(item.parentId, {
        $pull: { children: item._id },
      });
    }

    // Delete all children recursively
    await NavbarItem.deleteMany({ parentId: item._id });

    // Delete the item
    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: "Navbar item deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk reorder navbar items (Admin)
 */
exports.reorderNavbarItems = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      throw new AppError("Items array is required", 400, "INVALID_DATA");
    }

    for (const item of items) {
      await NavbarItem.findByIdAndUpdate(item.id, { order: item.order });
    }

    res.status(200).json({
      success: true,
      message: "Navbar items reordered successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed default navbar items (Admin)
 */
exports.seedNavbar = async (req, res, next) => {
  try {
    await NavbarItem.seedDefaults();

    res.status(200).json({
      success: true,
      message: "Default navbar items seeded successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle navbar item visibility (Admin)
 */
exports.toggleVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await NavbarItem.findById(id);

    if (!item) {
      throw new AppError("Navbar item not found", 404, "NOT_FOUND");
    }

    item.isVisible = !item.isVisible;
    await item.save();

    res.status(200).json({
      success: true,
      data: { item },
      message: `Navbar item ${item.isVisible ? "shown" : "hidden"}`,
    });
  } catch (error) {
    next(error);
  }
};
