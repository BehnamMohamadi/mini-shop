// models/basket-model.js - Updated to match order schema pattern
const { Schema, model } = require("mongoose");

const basketSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },

    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        count: {
          type: Number,
          required: [true, "Product count is required"],
          min: [1, "Count must be at least 1"],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    totalPrice: {
      type: Number,
      default: 0,
      min: [0, "Total price cannot be negative"],
    },

    totalItems: {
      type: Number,
      default: 0,
      min: [0, "Total items cannot be negative"],
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

basketSchema.pre("save", async function (next) {
  let totalPrice = 0;
  let totalItems = 0;

  if (this.products.length > 0) {
    const { products } = await this.populate("products.product", { price: 1 });

    for (const { product, count } of products) {
      if (product && product.price) {
        totalPrice += product.price * count;
        totalItems += count;
      }
    }
  }

  this.totalPrice = totalPrice;
  this.totalItems = totalItems;
  this.lastUpdated = new Date();

  next();
});

basketSchema.methods.addItem = async function (productId, count) {
  let existingItem = null;

  for (let item of this.products) {
    if (item.product.toString() === productId.toString()) {
      existingItem = item;
      break;
    }
  }

  if (existingItem) {
    existingItem.count += count;
  } else {
    this.products.push({
      product: productId,
      count: count,
    });
  }

  return this.save();
};

basketSchema.methods.updateItemCount = async function (productId, count) {
  let itemFound = false;

  for (let i = 0; i < this.products.length; i++) {
    if (this.products[i].product.toString() === productId.toString()) {
      if (count <= 0) {
        this.products.splice(i, 1);
      } else {
        this.products[i].count = count;
      }
      itemFound = true;
      break;
    }
  }

  if (!itemFound) {
    throw new Error("Item not found in basket");
  }

  return this.save();
};

basketSchema.methods.removeItem = async function (productId) {
  const newProducts = [];

  for (let item of this.products) {
    if (item.product.toString() !== productId.toString()) {
      newProducts.push(item);
    }
  }

  this.products = newProducts;
  return this.save();
};

basketSchema.methods.clearBasket = async function () {
  this.products = [];
  return this.save();
};

basketSchema.statics.findOrCreateBasket = async function (userId) {
  let basket = await this.findOne({ user: userId }).populate("products.product");

  if (!basket) {
    basket = await this.create({ user: userId, products: [] });
    basket = await this.findById(basket._id).populate("products.product");
  }

  return basket;
};

const Basket = model("Basket", basketSchema);

module.exports = Basket;
