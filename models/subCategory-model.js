//subcategory-model.js

const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");

const allowedSubCategories = process.env.SEED_PRODUCTS_SUBCATEGORIES;

const SubCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: allowedSubCategories,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  icon: {
    type: String,
    default: "default-sub-icon.jpeg",
  },
});

// SubCategorySchema.pre("save", function (next) {
//   const icons = {
//     legumes: "legumes-icon.jpeg",
//     dairy: "dairy-icon.jpeg",
//     protein: "protein-icon.jpeg",
//     smartPhone: "smartPhone-icon.jpeg",
//     laptop: "laptop-icon.jpeg",
//     tv: "tv-icon.jpeg",
//   };

//   this.icon = icons[this.name] || "default-sub-icon.jpeg";
//   next();
// });

module.exports = model("SubCategory", SubCategorySchema);
