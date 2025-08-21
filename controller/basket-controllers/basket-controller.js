// controller/basket-controller.js - Complete Updated File
const Basket = require("../../models/basket-model");
const Product = require("../../models/product-model");
const { AppError } = require("../../utils/app-error");

const getBasket = async (req, res, next) => {
  try {
    const basket = await Basket.findOrCreateBasket(req.user._id);

    res.status(200).json({
      status: "success",
      data: { basket },
    });
  } catch (error) {
    return next(new AppError(500, "Error retrieving basket"));
  }
};

// Add item to basket
const addToBasket = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validation
    if (!productId) {
      return next(new AppError(400, "Product ID is required"));
    }

    if (quantity < 1) {
      return next(new AppError(400, "Quantity must be at least 1"));
    }

    // Check if product exists and get current stock
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "Product not found"));
    }

    // Check stock availability
    if (product.quantity <= 0) {
      return next(new AppError(400, "Product is out of stock"));
    }

    // Get or create basket
    const basket = await Basket.findOrCreateBasket(req.user._id);

    // Check current quantity in basket
    const existingItem = basket.items.find(
      (item) => item.product._id.toString() === productId.toString()
    );

    const currentQuantityInBasket = existingItem ? existingItem.quantity : 0;
    const totalQuantityAfterAdd = currentQuantityInBasket + quantity;

    // Check if adding this quantity would exceed available stock
    if (totalQuantityAfterAdd > product.quantity) {
      const availableToAdd = product.quantity - currentQuantityInBasket;
      return next(
        new AppError(
          400,
          `Cannot add ${quantity} items. Only ${availableToAdd} more available (Total stock: ${product.quantity}, Currently in basket: ${currentQuantityInBasket})`
        )
      );
    }

    // Add item to basket
    await basket.addItem(productId, quantity, product.price);

    // Return updated basket with populated product details
    const updatedBasket = await Basket.findById(basket._id).populate("items.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `Added ${quantity} item(s) to basket`,
    });
  } catch (error) {
    console.error("Error in addToBasket:", error);
    return next(new AppError(500, "Error adding item to basket"));
  }
};

const updateBasketItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Validation
    if (quantity < 0) {
      return next(new AppError(400, "Quantity cannot be negative"));
    }

    // Get user's basket
    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    // If quantity is 0, remove the item
    if (quantity === 0) {
      await basket.removeItem(productId);
      const updatedBasket = await Basket.findById(basket._id).populate("items.product");
      return res.status(200).json({
        status: "success",
        data: { basket: updatedBasket },
        message: "Item removed from basket",
      });
    }

    // Check if product exists and get current stock
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "Product not found"));
    }

    // Check stock availability
    if (quantity > product.quantity) {
      return next(
        new AppError(
          400,
          `Insufficient stock. Only ${product.quantity} items available in inventory`
        )
      );
    }

    // Update item quantity
    await basket.updateItemQuantity(productId, quantity);

    // Return updated basket
    const updatedBasket = await Basket.findById(basket._id).populate("items.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `Quantity updated to ${quantity}`,
    });
  } catch (error) {
    console.error("Error in updateBasketItem:", error);
    if (error.message === "Item not found in basket") {
      return next(new AppError(404, "Item not found in basket"));
    }
    return next(new AppError(500, "Error updating basket item"));
  }
};

const removeFromBasket = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Get user's basket
    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    // Remove item from basket
    await basket.removeItem(productId);

    // Return updated basket
    const updatedBasket = await Basket.findById(basket._id).populate("items.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: "Item removed from basket",
    });
  } catch (error) {
    console.error("Error in removeFromBasket:", error);
    return next(new AppError(500, "Error removing item from basket"));
  }
};

const clearBasket = async (req, res, next) => {
  try {
    // Get user's basket
    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    // Clear all items
    await basket.clearBasket();

    // Return empty basket
    const clearedBasket = await Basket.findById(basket._id).populate("items.product");

    res.status(200).json({
      status: "success",
      data: { basket: clearedBasket },
      message: "Basket cleared successfully",
    });
  } catch (error) {
    console.error("Error in clearBasket:", error);
    return next(new AppError(500, "Error clearing basket"));
  }
};

// Updated sync function to handle localStorage sync without forcing database write
const syncBasket = async (req, res, next) => {
  try {
    const { items } = req.body; // Expected format: { productId: quantity, ... }

    if (!items || typeof items !== "object") {
      return next(new AppError(400, "Invalid items format"));
    }

    // Get or create basket
    const basket = await Basket.findOrCreateBasket(req.user._id);

    // Keep track of what was updated
    const syncResults = {
      added: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    // Process each item from localStorage
    for (const [productId, quantity] of Object.entries(items)) {
      try {
        if (quantity > 0) {
          // Check if product exists
          const product = await Product.findById(productId);
          if (!product) {
            syncResults.errors.push({ productId, error: "Product not found" });
            continue;
          }

          if (quantity > product.quantity) {
            syncResults.errors.push({
              productId,
              error: `Insufficient stock. Requested: ${quantity}, Available: ${product.quantity}`,
            });
            continue;
          }

          // Check if item already exists in basket
          const existingItem = basket.items.find(
            (item) => item.product._id.toString() === productId.toString()
          );

          if (existingItem) {
            // Update existing item only if localStorage has different quantity
            if (existingItem.quantity !== quantity) {
              await basket.updateItemQuantity(productId, quantity);
              syncResults.updated.push({ productId, quantity });
            } else {
              syncResults.skipped.push({ productId, reason: "Same quantity" });
            }
          } else {
            // Add new item
            await basket.addItem(productId, quantity, product.price);
            syncResults.added.push({ productId, quantity });
          }
        }
      } catch (itemError) {
        console.error(`Error syncing item ${productId}:`, itemError);
        syncResults.errors.push({ productId, error: itemError.message });
      }
    }

    // Return updated basket
    const updatedBasket = await Basket.findById(basket._id).populate("items.product");

    res.status(200).json({
      status: "success",
      data: {
        basket: updatedBasket,
        syncResults,
      },
      message: "Basket synced successfully",
    });
  } catch (error) {
    console.error("Error in syncBasket:", error);
    return next(new AppError(500, "Error syncing basket"));
  }
};

// New function to get basket summary without full details (faster)
const getBasketSummary = async (req, res, next) => {
  try {
    const basket = await Basket.findOne({ user: req.user._id });

    if (!basket) {
      return res.status(200).json({
        status: "success",
        data: {
          totalItems: 0,
          totalAmount: 0,
          itemCount: 0,
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        totalItems: basket.totalItems,
        totalAmount: basket.totalAmount,
        itemCount: basket.items.length,
      },
    });
  } catch (error) {
    console.error("Error in getBasketSummary:", error);
    return next(new AppError(500, "Error retrieving basket summary"));
  }
};

module.exports = {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  syncBasket,
  getBasketSummary,
};
