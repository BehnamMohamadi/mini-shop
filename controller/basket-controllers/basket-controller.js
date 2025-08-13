// controller/basket-controller.js
const Basket = require("../../models/basket-model");
const Product = require("../../models/product-model");
const { AppError } = require("../../utils/app-error");

// Get user's basket
const getBasket = async (req, res, next) => {
  const basket = await Basket.findOrCreateBasket(req.user._id);

  res.status(200).json({
    status: "success",
    data: { basket },
  });
};

// Add item to basket
const addToBasket = async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return next(new AppError(400, "Product ID is required"));
  }

  if (quantity < 1) {
    return next(new AppError(400, "Quantity must be at least 1"));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(404, "Product not found"));
  }

  const basket = await Basket.findOrCreateBasket(req.user._id);

  const existingItem = basket.items.find(
    (item) => item.product._id.toString() === productId.toString()
  );

  const currentQuantityInBasket = existingItem ? existingItem.quantity : 0;
  const totalQuantityAfterAdd = currentQuantityInBasket + quantity;

  if (product.quantity <= 0) {
    return next(new AppError(400, "Product is out of stock"));
  }

  if (totalQuantityAfterAdd > product.quantity) {
    return next(
      new AppError(
        400,
        `Cannot add ${quantity} items. Only ${
          product.quantity - currentQuantityInBasket
        } more available (Total stock: ${product.quantity})`
      )
    );
  }

  await basket.addItem(productId, quantity, product.price);

  const updatedBasket = await Basket.findById(basket._id).populate("items.product");

  res.status(200).json({
    status: "success",
    data: { basket: updatedBasket },
    message: `Added ${quantity} item(s) to basket`,
  });
};

const updateBasketItem = async (req, res, next) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity < 0) {
    return next(new AppError(400, "Quantity cannot be negative"));
  }

  const basket = await Basket.findOne({ user: req.user._id });
  if (!basket) {
    return next(new AppError(404, "Basket not found"));
  }

  if (quantity === 0) {
    await basket.removeItem(productId);
    const updatedBasket = await Basket.findById(basket._id).populate("items.product");
    return res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(404, "Product not found"));
  }

  if (quantity > product.quantity) {
    return next(
      new AppError(
        400,
        `موجودی کافی نیست. تنها ${product.quantity} عدد در انبار موجود است`
      )
    );
  }

  await basket.updateItemQuantity(productId, quantity);

  const updatedBasket = await Basket.findById(basket._id).populate("items.product");

  res.status(200).json({
    status: "success",
    data: { basket: updatedBasket },
    message: `Quantity updated to ${quantity}`,
  });
};

const removeFromBasket = async (req, res, next) => {
  const { productId } = req.params;

  const basket = await Basket.findOne({ user: req.user._id });
  if (!basket) {
    return next(new AppError(404, "Basket not found"));
  }

  await basket.removeItem(productId);

  const updatedBasket = await Basket.findById(basket._id).populate("items.product");

  res.status(200).json({
    status: "success",
    data: { basket: updatedBasket },
  });
};

const clearBasket = async (req, res, next) => {
  const basket = await Basket.findOne({ user: req.user._id });
  if (!basket) {
    return next(new AppError(404, "Basket not found"));
  }

  await basket.clearBasket();

  res.status(200).json({
    status: "success",
    data: { basket },
  });
};

const getBasketSummary = async (req, res, next) => {
  const basket = await Basket.findOne({ user: req.user._id });

  const summary = {
    totalItems: basket ? basket.totalItems : 0,
    totalAmount: basket ? basket.totalAmount : 0,
    itemCount: basket ? basket.items.length : 0,
  };

  res.status(200).json({
    status: "success",
    data: { summary },
  });
};

// Sync basket with product availability and prices
const syncBasket = async (req, res, next) => {
  try {
    const basket = await Basket.findOne({ user: req.user._id }).populate("items.product");
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    let hasChanges = false;
    const itemsToRemove = [];
    const itemsToUpdate = [];

    // Check each item in basket
    for (let i = 0; i < basket.items.length; i++) {
      const item = basket.items[i];

      if (!item.product) {
        // Product no longer exists
        itemsToRemove.push(item.product);
        hasChanges = true;
        continue;
      }

      // Update price if it has changed
      if (item.price !== item.product.price) {
        item.price = item.product.price;
        hasChanges = true;
      }

      // Adjust quantity if it exceeds available stock
      if (item.quantity > item.product.quantity) {
        if (item.product.quantity === 0) {
          itemsToRemove.push(item.product._id);
        } else {
          item.quantity = item.product.quantity;
          itemsToUpdate.push({
            productId: item.product._id,
            newQuantity: item.product.quantity,
          });
        }
        hasChanges = true;
      }
    }

    // Remove unavailable items
    for (const productId of itemsToRemove) {
      await basket.removeItem(productId);
    }

    // Update quantities for items with limited stock
    for (const update of itemsToUpdate) {
      await basket.updateItemQuantity(update.productId, update.newQuantity);
    }

    if (hasChanges) {
      await basket.save();
    }

    // Return updated basket
    const updatedBasket = await Basket.findById(basket._id).populate("items.product");

    res.status(200).json({
      status: "success",
      data: {
        basket: updatedBasket,
        hasChanges,
        message: hasChanges
          ? "Basket synchronized with current product availability"
          : "Basket is up to date",
      },
    });
  } catch (error) {
    return next(new AppError(500, "Error synchronizing basket"));
  }
};

module.exports = {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getBasketSummary,
  syncBasket,
};
