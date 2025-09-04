// models/wishlist-model.js - Wishlist/Favorites model

const { Schema, model } = require("mongoose");

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate entries
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

// Static method to toggle product in wishlist
wishlistSchema.statics.toggleWishlist = async function (userId, productId) {
  try {
    console.log("DEBUG: Toggling wishlist for user:", userId, "product:", productId);

    const existingItem = await this.findOne({ user: userId, product: productId });

    if (existingItem) {
      // Remove from wishlist
      await this.findByIdAndDelete(existingItem._id);
      console.log("DEBUG: Removed from wishlist");
      return { isInWishlist: false, message: "از علاقه‌مندی‌ها حذف شد" };
    } else {
      // Add to wishlist
      await this.create({ user: userId, product: productId });
      console.log("DEBUG: Added to wishlist");
      return { isInWishlist: true, message: "به علاقه‌مندی‌ها اضافه شد" };
    }
  } catch (error) {
    console.error("DEBUG: Error toggling wishlist:", error);
    throw error;
  }
};

// Static method to check if product is in user's wishlist
wishlistSchema.statics.isInWishlist = async function (userId, productId) {
  const item = await this.findOne({ user: userId, product: productId });
  return !!item;
};

// Static method to get user's wishlist
wishlistSchema.statics.getUserWishlist = async function (userId) {
  return this.find({ user: userId })
    .populate("product", "name price thumbnail brand quantity category subCategory")
    .sort({ addedAt: -1 });
};

// Static method to get wishlist count for user
wishlistSchema.statics.getWishlistCount = async function (userId) {
  return this.countDocuments({ user: userId });
};

const Wishlist = model("Wishlist", wishlistSchema);

module.exports = Wishlist;
