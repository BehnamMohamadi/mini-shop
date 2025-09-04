// controller/basket-controller.js - Complete fixed version with inventory management

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

// Add product to basket with proper validation
const addToBasket = async (req, res, next) => {
  const { productId, count = 1 } = req.body;

  if (!productId) {
    return next(new AppError(400, "product id is requirese"));
  }

  if (count < 1) {
    return next(new AppError(400, "product count should be more than one"));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(404, "cant find any product"));
  }

  if (product.quantity <= 0) {
    return next(new AppError(400, "this product is not remain"));
  }

  const basket = await Basket.findOrCreateBasket(req.user._id);

  // Check current quantity in basket
  const existingItem = basket.products.find(
    (item) => item.product._id.toString() === productId.toString()
  );
  const currentCountInBasket = existingItem ? existingItem.count : 0;
  const totalCountAfterAdd = currentCountInBasket + count;

  console.log("DEBUG: Inventory validation:", {
    currentInBasket: currentCountInBasket,
    requestedToAdd: count,
    totalAfterAdd: totalCountAfterAdd,
    availableStock: product.quantity,
  });

  // FIXED: Strict inventory checking - prevent overselling
  if (totalCountAfterAdd > product.quantity) {
    const availableToAdd = Math.max(0, product.quantity - currentCountInBasket);

    if (availableToAdd <= 0) {
      return next(
        new AppError(
          400,
          `محصول "${product.name}" با حداکثر مقدار موجود در سبد شما قرار دارد`
        )
      );
    }

    return next(
      new AppError(
        400,
        `تنها ${availableToAdd} عدد از محصول "${product.name}" در دسترس است`
      )
    );
  }

  await basket.addItem(productId, count);
  const updatedBasket = await Basket.findById(basket._id).populate("products.product");

  res.status(200).json({
    status: "success",
    data: { basket: updatedBasket },
    message: `${count} عدد محصول "${product.name}" به سبد اضافه شد`,
  });
};

// Update basket item quantity with proper validation
const updateBasketItem = async (req, res, next) => {
  const { productId } = req.params;
  const { count } = req.body;

  console.log("DEBUG: updateBasketItem called:", { productId, count });

  if (count < 0) {
    return next(new AppError(400, "تعداد نمی‌تواند منفی باشد"));
  }

  try {
    const basket = await Basket.findOne({
      user: req.user._id,
      status: { $in: ["open", "pending"] },
    })
      .populate("products.product")
      .sort({ lastUpdated: -1 });

    if (!basket) {
      return next(new AppError(404, "سبد فعال یافت نشد"));
    }

    console.log("DEBUG: Found basket with", basket.products.length, "products");
    basket.debugBasketContents();

    // If count is 0, remove the item
    if (count === 0) {
      console.log("DEBUG: Count is 0, removing item");
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

    // FIXED: Validate product exists in database
    const product = await Product.findById(productId);
    if (!product) {
      console.log("DEBUG: Product not found in database:", productId);
      return next(new AppError(404, "محصول در پایگاه داده یافت نشد"));
    }

    console.log("DEBUG: Product validation:", {
      name: product.name,
      currentStock: product.quantity,
      requestedCount: count,
    });

    // FIXED: Check inventory availability
    if (count > product.quantity) {
      return next(
        new AppError(
          400,
          `تنها ${product.quantity} عدد از محصول "${product.name}" در انبار موجود است`
        )
      );
    }

    // Update the item count
    await basket.updateItemCount(productId, count);
    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `تعداد محصول "${product.name}" به ${count} به‌روزرسانی شد`,
    });
  } catch (error) {
    console.error("DEBUG: Error in updateBasketItem:", error);

    if (error.message.includes("Cannot modify items in a basket that is not open")) {
      return next(
        new AppError(400, "نمی‌توان تعداد محصولات را تغییر داد. سبد در حالت فعال نیست")
      );
    }

    return next(new AppError(500, "خطا در به‌روزرسانی تعداد محصول"));
  }
};

// Remove item from basket
const removeFromBasket = async (req, res, next) => {
  try {
    const { productId } = req.params;

    console.log("DEBUG: removeFromBasket called:", productId);

    const basket = await Basket.findOne({
      user: req.user._id,
      status: "open",
    });

    if (!basket) {
      return next(new AppError(404, "سبد فعال یافت نشد"));
    }

    await basket.removeItem(productId);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: "محصول از سبد حذف شد",
    });
  } catch (error) {
    console.error("DEBUG: Error in removeFromBasket:", error);

    if (error.message.includes("Cannot remove items from a basket that is not open")) {
      return next(
        new AppError(400, "نمی‌توان محصول از سبد حذف کرد. سبد در حالت فعال نیست")
      );
    }

    return next(new AppError(500, "خطا در حذف محصول از سبد"));
  }
};

// Clear entire basket
const clearBasket = async (req, res, next) => {
  try {
    console.log("DEBUG: clearBasket called");

    const basket = await Basket.findOne({
      user: req.user._id,
      status: "open",
    });

    if (!basket) {
      return next(new AppError(404, "سبد فعال یافت نشد"));
    }

    await basket.clearBasket();

    const clearedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: clearedBasket },
      message: "سبد با موفقیت پاک شد",
    });
  } catch (error) {
    console.error("DEBUG: Error in clearBasket:", error);

    if (error.message.includes("Cannot clear a basket that is not open")) {
      return next(new AppError(400, "نمی‌توان سبد را پاک کرد. سبد در حالت فعال نیست"));
    }

    return next(new AppError(500, "خطا در پاک کردن سبد"));
  }
};

// FIXED: Update basket status with proper inventory reduction
const updateBasketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    console.log("DEBUG: updateBasketStatus called:", status);

    if (!status || !["open", "pending", "finished"].includes(status)) {
      return next(new AppError(400, "وضعیت معتبر الزامی است (open, pending, finished)"));
    }

    const basket = await Basket.findOne({
      user: req.user._id,
      status: { $ne: "finished" }, // Don't modify finished baskets
    })
      .populate("products.product")
      .sort({ lastUpdated: -1 });

    if (!basket) {
      return next(new AppError(404, "سبد فعال یافت نشد"));
    }

    console.log(
      "DEBUG: Found basket with status:",
      basket.status,
      "changing to:",
      status
    );

    // FIXED: When changing to finished, reduce inventory properly
    if (status === "finished" && basket.status !== "finished") {
      console.log("DEBUG: Processing order completion - reducing inventory...");

      if (basket.products.length === 0) {
        return next(new AppError(400, "نمی‌توان سبد خالی را تکمیل کرد"));
      }

      // First, validate all products exist and have sufficient stock
      const inventoryValidation = [];

      for (const item of basket.products) {
        // Get fresh product data from database
        const currentProduct = await Product.findById(item.product._id);

        if (!currentProduct) {
          return next(
            new AppError(404, `محصول "${item.product.name}" در پایگاه داده یافت نشد`)
          );
        }

        if (currentProduct.quantity < item.count) {
          return next(
            new AppError(
              400,
              `موجودی کافی برای "${currentProduct.name}" نیست. موجود: ${currentProduct.quantity}, سفارش: ${item.count}`
            )
          );
        }

        inventoryValidation.push({
          productId: currentProduct._id,
          productName: currentProduct.name,
          currentStock: currentProduct.quantity,
          orderedQuantity: item.count,
          newStock: currentProduct.quantity - item.count,
        });
      }

      console.log("DEBUG: Inventory validation passed, updating stock...");

      // Now reduce inventory for all products
      for (const update of inventoryValidation) {
        const updatedProduct = await Product.findByIdAndUpdate(
          update.productId,
          {
            quantity: update.newStock,
            updatedAt: new Date(),
          },
          { new: true }
        );

        console.log(
          `DEBUG: Updated inventory for "${update.productName}": ${update.currentStock} → ${update.newStock}`
        );

        // Log if product is now out of stock
        if (update.newStock === 0) {
          console.log(`WARNING: Product "${update.productName}" is now out of stock`);
        }
      }

      console.log("DEBUG: All inventory successfully reduced for completed order");
    }

    // Update the basket status
    await basket.updateStatus(status);

    // Re-fetch the updated basket
    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    console.log("DEBUG: Basket after status update:", {
      id: updatedBasket._id,
      status: updatedBasket.status,
      totalItems: updatedBasket.totalItems,
      totalPrice: updatedBasket.totalPrice,
      productCount: updatedBasket.products.length,
    });

    let message;
    switch (status) {
      case "finished":
        message = "سفارش با موفقیت تکمیل شد! موجودی محصولات به‌روزرسانی شده است";
        break;
      case "pending":
        message = "سبد در حالت انتظار پرداخت قرار گرفت";
        break;
      case "open":
        message = "سبد برای تغییرات باز شد";
        break;
      default:
        message = `وضعیت سبد به ${status} تغییر یافت`;
    }

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: message,
    });
  } catch (error) {
    console.error("DEBUG: Error updating basket status:", error);
    return next(new AppError(500, error.message || "خطا در به‌روزرسانی وضعیت سبد"));
  }
};

// Get basket summary
const getBasketSummary = async (req, res, next) => {
  try {
    console.log("DEBUG: Getting basket summary for user:", req.user._id);

    // Get the active basket (open or pending)
    const activeBasket = await Basket.findOne({
      user: req.user._id,
      status: { $in: ["open", "pending"] },
    }).sort({ lastUpdated: -1 });

    console.log("DEBUG: Active basket found:", !!activeBasket);

    if (!activeBasket) {
      console.log("DEBUG: No active basket found, returning defaults");
      return res.status(200).json({
        status: "success",
        data: {
          totalItems: 0,
          totalPrice: 0,
          itemCount: 0,
          basketStatus: "open",
        },
      });
    }

    console.log("DEBUG: Returning active basket summary:", {
      totalItems: activeBasket.totalItems,
      totalPrice: activeBasket.totalPrice,
      itemCount: activeBasket.products.length,
      basketStatus: activeBasket.status,
    });

    res.status(200).json({
      status: "success",
      data: {
        totalItems: activeBasket.totalItems,
        totalPrice: activeBasket.totalPrice,
        itemCount: activeBasket.products.length,
        basketStatus: activeBasket.status,
      },
    });
  } catch (error) {
    console.error("DEBUG: Error getting basket summary:", error);
    return next(new AppError(500, "خطا در دریافت خلاصه سبد"));
  }
};

// Get user's basket history
const getBasketHistory = async (req, res, next) => {
  try {
    console.log("DEBUG: Getting basket history for user:", req.user._id);

    // Get all finished baskets for the user
    const finishedBaskets = await Basket.find({
      user: req.user._id,
      status: "finished",
    })
      .populate("products.product", "name price thumbnail brand")
      .sort({ completedAt: -1, createdAt: -1 });

    console.log("DEBUG: Found", finishedBaskets.length, "finished baskets");

    // Transform the data for frontend consumption
    const historyData = finishedBaskets.map((basket) => ({
      _id: basket._id,
      status: basket.status,
      totalItems: basket.totalItems,
      totalPrice: basket.totalPrice,
      completedAt: basket.completedAt || basket.updatedAt,
      createdAt: basket.createdAt,
      products: basket.products.map((item) => ({
        product: item.product,
        count: item.count,
        addedAt: item.addedAt,
      })),
    }));

    res.status(200).json({
      status: "success",
      results: historyData.length,
      data: { baskets: historyData },
    });
  } catch (error) {
    console.error("DEBUG: Error getting basket history:", error);
    return next(new AppError(500, "خطا در دریافت تاریخچه سبد"));
  }
};

// Debug endpoint for troubleshooting
const debugBasket = async (req, res, next) => {
  try {
    console.log("DEBUG: Debug endpoint called for user:", req.user._id);

    const allUserBaskets = await Basket.find({ user: req.user._id })
      .populate("products.product", "name price quantity")
      .sort({ createdAt: -1 });

    console.log("DEBUG: User has", allUserBaskets.length, "total baskets");

    const debugInfo = {
      userId: req.user._id,
      totalBaskets: allUserBaskets.length,
      baskets: allUserBaskets.map((basket) => ({
        id: basket._id,
        status: basket.status,
        totalItems: basket.totalItems,
        totalPrice: basket.totalPrice,
        productCount: basket.products.length,
        createdAt: basket.createdAt,
        completedAt: basket.completedAt,
        products: basket.products.map((item) => ({
          productId: item.product._id,
          productName: item.product.name,
          productStock: item.product.quantity,
          orderedCount: item.count,
          addedAt: item.addedAt,
        })),
      })),
    };

    res.json({
      status: "success",
      data: debugInfo,
    });
  } catch (error) {
    console.error("DEBUG: Error in debug endpoint:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
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
  debugBasket,
};
