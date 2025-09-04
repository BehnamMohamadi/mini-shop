// models/basket-model.js - Complete rewritten file

const { Schema, model } = require("mongoose");

const basketSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
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

    status: {
      type: String,
      enum: {
        values: ["open", "pending", "finished"],
        message: "Status must be one of: open, pending, finished",
      },
      default: "open",
      required: [true, "Basket status is required"],
    },

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

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes - Allow multiple baskets per user with different statuses
basketSchema.index({ user: 1, status: 1 });
basketSchema.index({ status: 1 });
basketSchema.index({ createdAt: -1 });

basketSchema.pre("save", async function (next) {
  let totalPrice = 0;
  let totalItems = 0;

  if (this.products.length > 0) {
    if (!this.populated("products.product")) {
      await this.populate("products.product");
    }

    for (const item of this.products) {
      if (item.product && item.product.price && item.count > 0) {
        const itemSubtotal = item.product.price * item.count;
        totalPrice += itemSubtotal;
        totalItems += item.count;
      }
    }
  }

  this.totalPrice = totalPrice;
  this.totalItems = totalItems;
  this.lastUpdated = new Date();

  if (this.status === "finished" && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

basketSchema.methods.addItem = async function (productId, count) {
  if (this.status !== "open") {
    throw new Error("Cannot add items to a basket that is not open");
  }

  let existingItemIndex = -1;

  for (let i = 0; i < this.products.length; i++) {
    if (this.products[i].product.toString() === productId.toString()) {
      existingItemIndex = i;
      break;
    }
  }

  if (existingItemIndex >= 0) {
    this.products[existingItemIndex].count += count;
  } else {
    this.products.push({
      product: productId,
      count: count,
      addedAt: new Date(),
    });
  }

  return this.save();
};

// Update item count in basket
basketSchema.methods.updateItemCount = async function (productId, count) {
  console.log("DEBUG: updateItemCount - ProductId:", productId, "New Count:", count);

  if (this.status !== "open") {
    throw new Error("Cannot modify items in a basket that is not open");
  }

  let itemIndex = -1;

  for (let i = 0; i < this.products.length; i++) {
    if (this.products[i].product.toString() === productId.toString()) {
      itemIndex = i;
      break;
    }
  }

  if (itemIndex >= 0) {
    if (count <= 0) {
      console.log("DEBUG: Removing item at index:", itemIndex);
      this.products.splice(itemIndex, 1);
    } else {
      console.log("DEBUG: Updating item count to:", count);
      this.products[itemIndex].count = count;
    }
  } else {
    // Item not found - add it if count > 0
    if (count > 0) {
      console.log("DEBUG: Item not found, adding new item");
      this.products.push({
        product: productId,
        count: count,
        addedAt: new Date(),
      });
    } else {
      console.log("DEBUG: Item not found and count is 0, nothing to do");
    }
  }

  return this.save();
};

// Remove item from basket
basketSchema.methods.removeItem = async function (productId) {
  console.log("DEBUG: removeItem - ProductId:", productId);

  if (this.status !== "open") {
    throw new Error("Cannot remove items from a basket that is not open");
  }

  const initialLength = this.products.length;
  this.products = this.products.filter(
    (item) => item.product.toString() !== productId.toString()
  );

  console.log(
    "DEBUG: Removed item, products count:",
    initialLength,
    "->",
    this.products.length
  );
  return this.save();
};

// Clear all items from basket
basketSchema.methods.clearBasket = async function () {
  console.log("DEBUG: clearBasket called");

  if (this.status !== "open") {
    throw new Error("Cannot clear a basket that is not open");
  }

  this.products = [];
  console.log("DEBUG: Basket cleared");
  return this.save();
};

// Update basket status
basketSchema.methods.updateStatus = async function (newStatus) {
  console.log("DEBUG: Updating basket status from", this.status, "to", newStatus);
  this.status = newStatus;
  return this.save();
};

// Debug basket contents
basketSchema.methods.debugBasketContents = function () {
  console.log("DEBUG: Current basket contents:");
  console.log("  - Basket ID:", this._id);
  console.log("  - User:", this.user);
  console.log("  - Status:", this.status);
  console.log("  - Total products:", this.products.length);
  console.log("  - Total items:", this.totalItems);
  console.log("  - Total price:", this.totalPrice);

  this.products.forEach((item, index) => {
    const productId = item.product._id || item.product;
    const productName = item.product.name || "Unknown";
    console.log(`  - ${index}: ${productName} (ID: ${productId}, Count: ${item.count})`);
  });

  return this.products;
};

basketSchema.statics.findOrCreateBasket = async function (userId) {
  let activeBaskets = await this.find({
    user: userId,
    status: { $in: ["open", "pending"] },
  })
    .populate("products.product")
    .sort({ lastUpdated: -1 });

  if (activeBaskets.length > 0) {
    const basket = activeBaskets[0];
    return basket;
  }

  const newBasket = await this.create({
    user: userId,
    products: [],
    status: "open",
  });

  const populatedBasket = await this.findById(newBasket._id).populate("products.product");

  return populatedBasket;
};

// Static method: Get user's basket history
basketSchema.statics.getBasketHistory = async function (userId) {
  console.log("DEBUG: Getting basket history for user:", userId);

  return this.find({
    user: userId,
    status: "finished",
  })
    .populate("products.product", "name price thumbnail brand")
    .sort({ completedAt: -1, createdAt: -1 });
};

// Static method: Get all user's baskets
basketSchema.statics.getUserBaskets = async function (userId) {
  return this.find({ user: userId })
    .populate("products.product", "name price thumbnail brand")
    .sort({ createdAt: -1 });
};

const Basket = model("Basket", basketSchema);

module.exports = Basket;
