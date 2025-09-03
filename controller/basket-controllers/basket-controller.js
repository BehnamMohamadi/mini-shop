// controller/basket-controller.js - Complete rewritten file

const Basket = require("../../models/basket-model");
const Product = require("../../models/product-model");
const { AppError } = require("../../utils/app-error");
const { ApiFeatures } = require("../../utils/api-features");

// Get user's active basket
const getBasket = async (req, res, next) => {
  try {
    console.log("DEBUG: Getting basket for user:", req.user._id);

    const basket = await Basket.findOrCreateBasket(req.user._id);

    console.log("DEBUG: Retrieved/created basket:", {
      id: basket._id,
      status: basket.status,
      totalItems: basket.totalItems,
      productCount: basket.products.length,
    });

    res.status(200).json({
      status: "success",
      data: { basket },
    });
  } catch (error) {
    console.error("DEBUG: Error getting basket:", error);
    return next(new AppError(500, "خطا در دریافت سبد"));
  }
};

// Get all baskets (admin function)
const getAllBaskets = async (req, res, next) => {
  try {
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
  } catch (error) {
    console.error("DEBUG: Error getting all baskets:", error);
    return next(new AppError(500, "خطا در دریافت لیست سبدها"));
  }
};

// Add product to basket
const addToBasket = async (req, res, next) => {
  const { productId, count = 1 } = req.body;

  console.log("DEBUG: addToBasket called:", { productId, count });

  if (!productId) {
    return next(new AppError(400, "شناسه محصول الزامی است"));
  }

  if (count < 1) {
    return next(new AppError(400, "تعداد باید حداقل 1 باشد"));
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "محصول یافت نشد"));
    }

    console.log("DEBUG: Product found:", product.name, "- Stock:", product.quantity);

    // Get or create basket
    const basket = await Basket.findOrCreateBasket(req.user._id);

    // Check current quantity in basket
    const existingItem = basket.products.find(
      (item) => item.product._id.toString() === productId.toString()
    );
    const currentCountInBasket = existingItem ? existingItem.count : 0;
    const totalCountAfterAdd = currentCountInBasket + count;

    console.log("DEBUG: Inventory check:", {
      currentInBasket: currentCountInBasket,
      requestedToAdd: count,
      totalAfterAdd: totalCountAfterAdd,
      availableStock: product.quantity,
    });

    // Optional: Set reasonable limits instead of strict inventory checking
    const MAX_QUANTITY_PER_ITEM = 100;

    if (totalCountAfterAdd > MAX_QUANTITY_PER_ITEM) {
      return next(
        new AppError(400, `حداکثر ${MAX_QUANTITY_PER_ITEM} عدد برای هر محصول مجاز است`)
      );
    }

    // Optional: Uncomment for strict inventory checking
    /*
    if (totalCountAfterAdd > product.quantity) {
      const availableToAdd = product.quantity - currentCountInBasket;
      
      if (availableToAdd <= 0) {
        return next(
          new AppError(400, `محصول با حداکثر مقدار مجاز در سبد شما موجود است`)
        );
      }

      return next(
        new AppError(400, `حداکثر ${availableToAdd} عدد دیگر می‌توانید اضافه کنید`)
      );
    }
    */

    await basket.addItem(productId, count);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `${count} عدد محصول اضافه شد`,
    });
  } catch (error) {
    console.error("DEBUG: Error in addToBasket:", error);

    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "نمی‌توان محصول به سبد اضافه کرد. سبد در حالت فعال نیست")
      );
    }

    return next(new AppError(500, error.message || "خطا در افزودن محصول به سبد"));
  }
};

// Update basket item quantity
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

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "محصول یافت نشد"));
    }

    console.log("DEBUG: Product found:", product.name, "- Stock:", product.quantity);

    // Set reasonable limits
    const MAX_QUANTITY_PER_ITEM = 100;
    if (count > MAX_QUANTITY_PER_ITEM) {
      return next(
        new AppError(400, `حداکثر ${MAX_QUANTITY_PER_ITEM} عدد برای هر محصول مجاز است`)
      );
    }

    // Optional: Uncomment for strict inventory checking
    /*
    if (count > product.quantity) {
      return next(new AppError(400, `موجودی کافی نیست. حداکثر ${product.quantity} عدد موجود است`));
    }
    */

    // Update the item count (will add if doesn't exist)
    await basket.updateItemCount(productId, count);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `تعداد به ${count} به‌روزرسانی شد`,
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

// Update basket status
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

    // If changing to finished, handle order completion
    if (status === "finished" && basket.status !== "finished") {
      console.log("DEBUG: Processing order completion");

      if (basket.products.length === 0) {
        return next(new AppError(400, "نمی‌توان سبد خالی را تکمیل کرد"));
      }

      // Optional: Reduce inventory when order is completed
      /*
      for (const item of basket.products) {
        const product = item.product;
        const orderQuantity = item.count;

        console.log(`DEBUG: Checking inventory for ${product.name}: Available: ${product.quantity}, Ordered: ${orderQuantity}`);

        if (product.quantity < orderQuantity) {
          return next(new AppError(400, `موجودی کافی برای ${product.name} نیست. موجود: ${product.quantity}, سفارش: ${orderQuantity}`));
        }
      }

      // Reduce inventory
      for (const item of basket.products) {
        const product = item.product;
        const orderQuantity = item.count;
        const newQuantity = Math.max(0, product.quantity - orderQuantity);

        await Product.findByIdAndUpdate(product._id, {
          quantity: newQuantity,
        });

        console.log(`DEBUG: Updated inventory for ${product.name}: ${product.quantity} → ${newQuantity}`);
      }
      */

      console.log("DEBUG: Order completed successfully");
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
        message = "سفارش با موفقیت تکمیل شد!";
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
      .populate("products.product", "name price")
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
          count: item.count,
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
