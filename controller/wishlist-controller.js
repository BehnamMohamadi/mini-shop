// controller/wishlist-controller.js - Wishlist functionality controller

const Wishlist = require("../models/wishlist-model");
const Product = require("../models/product-model");
const { AppError } = require("../utils/app-error");

// Toggle product in/out of wishlist
const toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    console.log("DEBUG: Toggle wishlist for product:", productId);

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "محصول یافت نشد"));
    }

    const result = await Wishlist.toggleWishlist(req.user._id, productId);

    res.status(200).json({
      status: "success",
      data: {
        isInWishlist: result.isInWishlist,
        productId: productId,
        message: result.message,
      },
    });
  } catch (error) {
    console.error("DEBUG: Error toggling wishlist:", error);
    return next(new AppError(500, "خطا در به‌روزرسانی علاقه‌مندی‌ها"));
  }
};

// Get user's wishlist
const getWishlist = async (req, res, next) => {
  try {
    console.log("DEBUG: Getting wishlist for user:", req.user._id);

    const wishlistItems = await Wishlist.getUserWishlist(req.user._id);

    console.log("DEBUG: Found", wishlistItems.length, "wishlist items");

    res.status(200).json({
      status: "success",
      results: wishlistItems.length,
      data: { wishlist: wishlistItems },
    });
  } catch (error) {
    console.error("DEBUG: Error getting wishlist:", error);
    return next(new AppError(500, "خطا در دریافت علاقه‌مندی‌ها"));
  }
};

// Check if product is in wishlist
const checkWishlistStatus = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const isInWishlist = await Wishlist.isInWishlist(req.user._id, productId);

    res.status(200).json({
      status: "success",
      data: {
        isInWishlist,
        productId,
      },
    });
  } catch (error) {
    console.error("DEBUG: Error checking wishlist status:", error);
    return next(new AppError(500, "خطا در بررسی وضعیت علاقه‌مندی"));
  }
};

// Get wishlist count for user
const getWishlistCount = async (req, res, next) => {
  try {
    const count = await Wishlist.getWishlistCount(req.user._id);

    res.status(200).json({
      status: "success",
      data: { count },
    });
  } catch (error) {
    console.error("DEBUG: Error getting wishlist count:", error);
    return next(new AppError(500, "خطا در دریافت تعداد علاقه‌مندی‌ها"));
  }
};

// Remove from wishlist
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    console.log("DEBUG: Removing from wishlist:", productId);

    const deleted = await Wishlist.findOneAndDelete({
      user: req.user._id,
      product: productId,
    });

    if (!deleted) {
      return next(new AppError(404, "محصول در لیست علاقه‌مندی‌ها یافت نشد"));
    }

    res.status(200).json({
      status: "success",
      data: {
        message: "محصول از علاقه‌مندی‌ها حذف شد",
        productId,
      },
    });
  } catch (error) {
    console.error("DEBUG: Error removing from wishlist:", error);
    return next(new AppError(500, "خطا در حذف از علاقه‌مندی‌ها"));
  }
};

// Clear entire wishlist
const clearWishlist = async (req, res, next) => {
  try {
    console.log("DEBUG: Clearing wishlist for user:", req.user._id);

    const result = await Wishlist.deleteMany({ user: req.user._id });

    res.status(200).json({
      status: "success",
      data: {
        message: "تمام علاقه‌مندی‌ها پاک شدند",
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("DEBUG: Error clearing wishlist:", error);
    return next(new AppError(500, "خطا در پاک کردن علاقه‌مندی‌ها"));
  }
};

module.exports = {
  toggleWishlist,
  getWishlist,
  checkWishlistStatus,
  getWishlistCount,
  removeFromWishlist,
  clearWishlist,
};
