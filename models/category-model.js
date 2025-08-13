//category-model.js

const { Schema, model } = require("mongoose");

const allowedCategories = process.env.SEED_PRODUCTS_CATEGORIES;

const CategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: allowedCategories,
    },
    icon: {
      type: String,
      default: "default-icon.jpeg",
    },
  },
  { timestamps: true }
);

// CategorySchema.pre("save", function (next) {
//   const icons = {
//     grocery: "grocery-icon.jpeg",
//     electric: "electric-icon.jpeg",
//   };

//   this.icon = icons[this.name] || "default-icon.jpeg";
//   next();
// });

module.exports = model("Category", CategorySchema);
