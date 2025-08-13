//product-model.js

const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");

const ProductSchema = new Schema(
  {
    name: { type: String, unique: true, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    brand: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, default: "default-thumbnail.jpeg" },
    images: [String],
    rating: {
      totalVotes: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = model("Product", ProductSchema);
