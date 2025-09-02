const router = require("express").Router();
const { protect, restrictTo } = require("../../controller/auth-controller.js");
const { asyncHandler } = require("../../utils/async-handler");
const { validator } = require("../../validation/validator");
const {
  addToBasketValidationSchema,
  updateBasketItemValidationSchema,
  updateBasketStatusValidationSchema,
} = require("../../validation/basket-validator");
const {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getAllBaskets,
  getBasketSummary,
  updateBasketStatus,
  getBasketHistory,
} = require("../../controller/basket-controllers/basket-controller");

// Admin only routes
router.get(
  "/get-all-baskets",
  asyncHandler(protect),
  restrictTo("admin"),
  asyncHandler(getAllBaskets)
);

// Apply authentication to all other routes
router.use(asyncHandler(protect), restrictTo("customer", "admin"));

// Basic basket operations
router.get("/", asyncHandler(getBasket));
router.get("/summary", asyncHandler(getBasketSummary));

router.post("/", validator(addToBasketValidationSchema), asyncHandler(addToBasket));

router.put(
  "/item/:productId",
  validator(updateBasketItemValidationSchema),
  asyncHandler(updateBasketItem)
);

router.delete("/item/:productId", asyncHandler(removeFromBasket));
router.delete("/", asyncHandler(clearBasket));

// Status management
router.patch(
  "/status",
  validator(updateBasketStatusValidationSchema),
  asyncHandler(updateBasketStatus)
);

// History
router.get("/history", asyncHandler(getBasketHistory));

module.exports = router;
