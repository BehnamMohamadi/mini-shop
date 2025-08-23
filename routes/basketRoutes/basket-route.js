const router = require("express").Router();
const { protect, restrictTo } = require("../../controller/auth-controller");
const { asyncHandler } = require("../../utils/async-handler");
const { validator } = require("../../validation/validator");
const {
  addToBasketValidationSchema,
  updateBasketItemValidationSchema,
} = require("../../validation/basket-validator");
const {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getAllBaskets,
  getBasketSummary,
} = require("../../controller/basket-controllers/basket-controller");

router.get(
  "/get-all-baskets",
  asyncHandler(protect),
  restrictTo("admin"),
  asyncHandler(getAllBaskets)
);

router.use(asyncHandler(protect), restrictTo("customer", "admin"));

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

module.exports = router;
