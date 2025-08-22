// controller/basket-controller.js - Updated for new schema
const Basket = require("../../models/basket-model");
const Product = require("../../models/product-model");
const { AppError } = require("../../utils/app-error");
const { ApiFeatures } = require("../../utils/api-features");

const getBasket = async (req, res, next) => {
  const basket = await Basket.findOrCreateBasket(req.user._id);

  res.status(200).json({
    status: "success",
    data: { basket },
  });
};

const getAllBaskets = async (req, res, next) => {
  const basketModel = new ApiFeatures(
    Basket.find({}).populate("user", "firstname lastname username"),
    req.query
  )
    .sort()
    .filter()
    .paginate()
    .limitFields();

  const baskets = await basketModel.model.populate(
    "products.product",
    "name price thumbnail"
  );

  const totalModels = new ApiFeatures(Basket.find({}), req.query).filter();
  const total = await totalModels.model;

  const { page = 1, limit = 10 } = req.query;

  res.status(200).json({
    status: "success",
    page: Number(page),
    perpage: Number(limit),
    total: total.length,
    totalPages: Math.ceil(total.length / Number(limit)),
    data: { baskets },
  });
};

// Add item to basket
const addToBasket = async (req, res, next) => {
  const { productId, count = 1 } = req.body;

  if (!productId) {
    return next(new AppError(400, "Product ID is required"));
  }

  if (count < 1) {
    return next(new AppError(400, "Count must be at least 1"));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(404, "Product not found"));
  }

  if (product.quantity <= 0) {
    return next(new AppError(400, "Product is out of stock"));
  }

  const basket = await Basket.findOrCreateBasket(req.user._id);

  const existingItem = basket.products.find(
    (item) => item.product._id.toString() === productId.toString()
  );

  const currentCountInBasket = existingItem ? existingItem.count : 0;
  const totalCountAfterAdd = currentCountInBasket + count;

  // Check if adding this count would exceed available stock
  if (totalCountAfterAdd > product.quantity) {
    const availableToAdd = product.quantity - currentCountInBasket;
    return next(
      new AppError(
        400,
        `Cannot add ${count} items. Only ${availableToAdd} more available (Total stock: ${product.quantity}, Currently in basket: ${currentCountInBasket})`
      )
    );
  }

  // Add item to basket
  await basket.addItem(productId, count);

  // Return updated basket with populated product details
  const updatedBasket = await Basket.findById(basket._id).populate("products.product");

  res.status(200).json({
    status: "success",
    data: { basket: updatedBasket },
    message: `Added ${count} item(s) to basket`,
  });
};

const updateBasketItem = async (req, res, next) => {
  const { productId } = req.params;
  const { count } = req.body;

  if (count < 0) {
    return next(new AppError(400, "Count cannot be negative"));
  }

  const basket = await Basket.findOne({ user: req.user._id });
  if (!basket) {
    return next(new AppError(404, "Basket not found"));
  }

  if (count === 0) {
    await basket.removeItem(productId);
    const updatedBasket = await Basket.findById(basket._id).populate("products.product");
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
  if (count > product.quantity) {
    return next(
      new AppError(
        400,
        `Insufficient stock. Only ${product.quantity} items available in inventory`
      )
    );
  }

  // Update item count
  await basket.updateItemCount(productId, count);

  // Return updated basket
  const updatedBasket = await Basket.findById(basket._id).populate("products.product");

  res.status(200).json({
    status: "success",
    data: { basket: updatedBasket },
    message: `Count updated to ${count}`,
  });
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
    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

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
    const clearedBasket = await Basket.findById(basket._id).populate("products.product");

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
    const { items } = req.body; // Expected format: { productId: count, ... }

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
    for (const [productId, count] of Object.entries(items)) {
      try {
        if (count > 0) {
          // Check if product exists
          const product = await Product.findById(productId);
          if (!product) {
            syncResults.errors.push({ productId, error: "Product not found" });
            continue;
          }

          if (count > product.quantity) {
            syncResults.errors.push({
              productId,
              error: `Insufficient stock. Requested: ${count}, Available: ${product.quantity}`,
            });
            continue;
          }

          // Check if item already exists in basket
          const existingItem = basket.products.find(
            (item) => item.product._id.toString() === productId.toString()
          );

          if (existingItem) {
            // Update existing item only if localStorage has different count
            if (existingItem.count !== count) {
              await basket.updateItemCount(productId, count);
              syncResults.updated.push({ productId, count });
            } else {
              syncResults.skipped.push({ productId, reason: "Same count" });
            }
          } else {
            // Add new item
            await basket.addItem(productId, count);
            syncResults.added.push({ productId, count });
          }
        }
      } catch (itemError) {
        console.error(`Error syncing item ${productId}:`, itemError);
        syncResults.errors.push({ productId, error: itemError.message });
      }
    }

    // Return updated basket
    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

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
          totalPrice: 0,
          itemCount: 0,
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        totalItems: basket.totalItems,
        totalPrice: basket.totalPrice,
        itemCount: basket.products.length,
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
  getAllBaskets,
};
