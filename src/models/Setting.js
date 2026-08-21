const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      // required: true,
    },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "object", "array", "image"],
      default: "string",
    },
    group: {
      type: String,
      enum: [
        "general",
        "category",
        "collection",
        "shop",
        "hero",
        "about",
        "banner",
        "seo",
      ],
      default: "general",
    },
    description: {
      type: String,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
settingSchema.index({ key: 1 }, { unique: true });
settingSchema.index({ group: 1 });
settingSchema.index({ isPublic: 1 });

// Static method to get setting by key
settingSchema.statics.getValue = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  if (!setting) return defaultValue;
  return setting.value;
};

// Static method to get all settings by group
settingSchema.statics.getGroup = async function (group) {
  const settings = await this.find({ group });
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

module.exports = mongoose.model("Setting", settingSchema);
