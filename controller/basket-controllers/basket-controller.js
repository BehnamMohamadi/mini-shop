// controller/basket-controller.js - Fixed inventory validation
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

  try {
    const basket = await Basket.findOrCreateBasket(req.user._id);

    const existingItem = basket.products.find(
      (item) => item.product._id.toString() === productId.toString()
    );

    const currentCountInBasket = existingItem ? existingItem.count : 0;
    const totalCountAfterAdd = currentCountInBasket + count;

    // FIXED: More lenient inventory check - allow reasonable quantities
    if (totalCountAfterAdd > product.quantity) {
      const availableToAdd = product.quantity - currentCountInBasket;

      // If no more can be added, show specific message
      if (availableToAdd <= 0) {
        return next(
          new AppError(400, `محصول در سبد شما موجود است. موجودی کل: ${product.quantity}`)
        );
      }

      return next(
        new AppError(
          400,
          `حداکثر ${availableToAdd} عدد دیگر می‌توانید اضافه کنید (موجودی کل: ${product.quantity}, در سبد: ${currentCountInBasket})`
        )
      );
    }

    await basket.addItem(productId, count);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `${count} عدد محصول اضافه شد`,
    });
  } catch (error) {
    console.error("Error in addToBasket:", error);
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "نمی‌توان محصول به سبد اضافه کرد. سبد در حالت فعال نیست")
      );
    }
    return next(new AppError(500, error.message));
  }
};

// FIXED: Enhanced updateBasketItem with better validation
const updateBasketItem = async (req, res, next) => {
  const { productId } = req.params;
  const { count } = req.body;

  console.log("🔧 DEBUG: updateBasketItem called with:", { productId, count });

  if (count < 0) {
    return next(new AppError(400, "تعداد نمی‌تواند منفی باشد"));
  }

  try {
    const basket = await Basket.findOne({ user: req.user._id }).populate(
      "products.product"
    );
    if (!basket) {
      return next(new AppError(404, "سبد یافت نشد"));
    }

    console.log("🔧 DEBUG: Current basket status:", basket.status);

    if (count === 0) {
      console.log("🔧 DEBUG: Removing item from basket");
      await basket.removeItem(productId);
      const updatedBasket = await Basket.findById(basket._id).populate(
        "products.product"
      );
      return res.status(200).json({
        status: "success",
        data: { basket: updatedBasket },
        message: "محصول از سبد حذف شد",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "محصول یافت نشد"));
    }

    console.log("🔧 DEBUG: Product inventory:", product.quantity);
    console.log("🔧 DEBUG: Requested quantity:", count);

    // FIXED: More detailed inventory validation
    if (count > product.quantity) {
      console.log("🔧 DEBUG: Insufficient inventory");
      return next(
        new AppError(400, `موجودی کافی نیست. حداکثر ${product.quantity} عدد موجود است`)
      );
    }

    console.log("🔧 DEBUG: Updating item count in basket");
    await basket.updateItemCount(productId, count);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");
    console.log("🔧 DEBUG: Basket updated successfully");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `تعداد به ${count} به‌روزرسانی شد`,
    });
  } catch (error) {
    console.error("🔧 DEBUG: Error in updateBasketItem:", error);

    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "نمی‌توان تعداد محصولات را تغییر داد. سبد در حالت فعال نیست")
      );
    }

    if (error.message.includes("Item not found in basket")) {
      return next(new AppError(404, "محصول در سبد یافت نشد"));
    }

    return next(new AppError(500, "خطا در به‌روزرسانی تعداد محصول"));
  }
};

const removeFromBasket = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    await basket.removeItem(productId);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: "Item removed from basket",
    });
  } catch (error) {
    console.error("Error in removeFromBasket:", error);
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "Cannot remove basket items. Basket is not in open status")
      );
    }
    return next(new AppError(500, "Error removing item from basket"));
  }
};

const clearBasket = async (req, res, next) => {
  try {
    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    await basket.clearBasket();

    const clearedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: clearedBasket },
      message: "Basket cleared successfully",
    });
  } catch (error) {
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(new AppError(400, "Cannot clear basket. Basket is not in open status"));
    }
    throw error;
  }
};

// FIXED: Enhanced status update with inventory management
const updateBasketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !["open", "pending", "finished"].includes(status)) {
      return next(
        new AppError(400, "Valid status is required (open, pending, finished)")
      );
    }

    const basket = await Basket.findOne({ user: req.user._id }).populate(
      "products.product"
    );
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    // If changing to finished, reduce product quantities
    if (status === "finished" && basket.status !== "finished") {
      console.log("Processing order completion - reducing inventory...");

      // Create an array to track inventory updates
      const inventoryUpdates = [];

      for (const item of basket.products) {
        const product = item.product;
        const orderQuantity = item.count;

        if (product.quantity < orderQuantity) {
          return next(
            new AppError(
              400,
              `موجودی کافی برای ${product.name} نیست. موجود: ${product.quantity}, سفارش: ${orderQuantity}`
            )
          );
        }

        inventoryUpdates.push({
          productId: product._id,
          newQuantity: product.quantity - orderQuantity,
          orderedQuantity: orderQuantity,
          productName: product.name,
        });
      }

      // Apply all inventory updates
      for (const update of inventoryUpdates) {
        await Product.findByIdAndUpdate(update.productId, {
          quantity: update.newQuantity,
        });

        console.log(
          `Reduced inventory for ${update.productName}: ${update.orderedQuantity} units. New stock: ${update.newQuantity}`
        );
      }

      console.log("Inventory successfully updated for completed order");
    }

    await basket.updateStatus(status);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    let message = `وضعیت سبد به ${status} تغییر یافت`;
    if (status === "finished") {
      message = "سفارش با موفقیت تکمیل شد! موجودی محصولات به‌روزرسانی شده است";
    } else if (status === "pending") {
      message = "سبد در حالت انتظار پرداخت قرار گرفت";
    } else if (status === "open") {
      message = "سبد برای تغییرات باز شد";
    }

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: message,
    });
  } catch (error) {
    console.error("Error updating basket status:", error);
    return next(new AppError(500, error.message || "خطا در به‌روزرسانی وضعیت سبد"));
  }
};

const getBasketSummary = async (req, res, next) => {
  try {
    // FIXED: Find current active basket (open or pending)
    const basket = await Basket.findOne({
      user: req.user._id,
      status: { $in: ["open", "pending"] },
    });

    if (!basket) {
      return res.status(200).json({
        status: "success",
        data: {
          totalItems: 0,
          totalPrice: 0,
          itemCount: 0,
          basketStatus: "open", // Default to open when no basket exists
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        totalItems: basket.totalItems,
        totalPrice: basket.totalPrice,
        itemCount: basket.products.length,
        basketStatus: basket.status,
      },
    });
  } catch (error) {
    console.error("Error getting basket summary:", error);
    return next(new AppError(500, "خطا در دریافت خلاصه سبد"));
  }
};

// Get user's basket history
const getBasketHistory = async (req, res, next) => {
  const baskets = await Basket.find({ user: req.user._id })
    .populate("products.product", "name price thumbnail")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: { baskets },
  });
};

module.exports = {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getBasketSummary,
  getAllBaskets,
  updateBasketStatus,
  getBasketHistory,
};
