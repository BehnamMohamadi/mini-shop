// models/basket-model.js
const mongoose = require("mongoose");

const basketItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Product ID is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
    default: 1,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const basketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    items: [basketItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
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

basketSchema.methods.calculateTotals = function () {
  let totalItems = 0;
  let totalAmount = 0;

  for (let item of this.items) {
    totalItems += item.quantity;
    totalAmount += item.price * item.quantity;
  }

  this.totalItems = totalItems;
  this.totalAmount = totalAmount;
  this.lastUpdated = new Date();
};

basketSchema.pre("save", function (next) {
  this.calculateTotals();
  next();
});

basketSchema.methods.addItem = function (productId, quantity, price) {
  let existingItem = null;

  for (let item of this.items) {
    if (item.product.toString() === productId.toString()) {
      existingItem = item;
      break;
    }
  }

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = price;
  } else {
    this.items.push({
      product: productId,
      quantity: quantity,
      price: price,
    });
  }

  return this.save();
};

basketSchema.methods.updateItemQuantity = function (productId, quantity) {
  let itemFound = false;

  for (let i = 0; i < this.items.length; i++) {
    if (this.items[i].product.toString() === productId.toString()) {
      if (quantity <= 0) {
        this.items.splice(i, 1);
      } else {
        this.items[i].quantity = quantity;
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

basketSchema.methods.removeItem = function (productId) {
  const newItems = [];

  for (let item of this.items) {
    if (item.product.toString() !== productId.toString()) {
      newItems.push(item);
    }
  }

  this.items = newItems;
  return this.save();
};

basketSchema.methods.clearBasket = function () {
  this.items = [];
  return this.save();
};

basketSchema.statics.findOrCreateBasket = async function (userId) {
  let basket = await this.findOne({ user: userId }).populate("items.product");

  if (!basket) {
    basket = await this.create({ user: userId, items: [] });
    basket = await this.findById(basket._id).populate("items.product");
  }

  return basket;
};

const Basket = mongoose.model("Basket", basketSchema);

module.exports = Basket;
