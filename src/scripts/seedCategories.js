// backend/src/scripts/seedCategories.js

const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("../models/Category");

const newCategories = [
  {
    name: "date-night",
    displayName: "DATE NIGHT",
    description: "Captivating. Romantic. Unforgettable.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486553/elegance-perfumes/products/b26aq2b3qvl6hjna0evy.jpg",
      publicId: "default/date-night",
      alt: "Date Night fragrances",
    },
  },
  {
    name: "office-wear",
    displayName: "OFFICE WEAR",
    description: "Professional. Polished. Powerful.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486353/elegance-perfumes/products/isekelztrbiic2hr65d2.jpg",
      publicId: "default/office-wear",
      alt: "Office Wear fragrances",
    },
  },
  {
    name: "wedding",
    displayName: "WEDDING",
    description: "Celebratory. Luxurious. Memorable.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486395/elegance-perfumes/products/gjwincwtlkm87gelz9vr.jpg",
      publicId: "default/wedding",
      alt: "Wedding fragrances",
    },
  },
  {
    name: "everyday-wear",
    displayName: "EVERYDAY WEAR",
    description: "Effortless. Versatile. Signature.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486318/elegance-perfumes/products/ov8ulaarz3xrmbetyjbh.jpg",
      publicId: "default/everyday-wear",
      alt: "Everyday Wear fragrances",
    },
  },
  {
    name: "evening",
    displayName: "EVENING",
    description: "Dramatic. Mysterious. Alluring.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787485975/elegance-perfumes/products/o4ccvrrzubpdkue0rnqg.jpg",
      publicId: "default/evening",
      alt: "Evening fragrances",
    },
  },
  {
    name: "summer",
    displayName: "SUMMER",
    description: "Fresh. Vibrant. Radiant.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787486148/elegance-perfumes/products/xewco1su0xcng3aimaib.jpg",
      publicId: "default/summer",
      alt: "Summer fragrances",
    },
  },
  {
    name: "winter",
    displayName: "WINTER",
    description: "Warm. Cozy. Intimate.",
    image: {
      url: "https://res.cloudinary.com/dcjhzgigb/image/upload/v1787485975/elegance-perfumes/products/o4ccvrrzubpdkue0rnqg.jpg",
      publicId: "default/winter",
      alt: "Winter fragrances",
    },
  },
];

const seedNewCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    for (const category of newCategories) {
      const exists = await Category.findOne({ name: category.name });
      if (!exists) {
        await Category.create(category);
        console.log(`✅ Added category: ${category.displayName}`);
      } else {
        console.log(`ℹ️ Category already exists: ${category.displayName}`);
      }
    }

    console.log("✅ All categories seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  }
};

seedNewCategories();
