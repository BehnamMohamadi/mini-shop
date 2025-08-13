// routes/basket-route.js
const router = require("express").Router();
const { protect } = require("../../controller/auth-controller");
const { asyncHandler } = require("../../utils/async-handler");
const {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getBasketSummary,
  syncBasket,
} = require("../../controller/basket-controllers/basket-controller");

// All basket routes require authentication
router.use(asyncHandler(protect));

// GET /api/basket - Get user's basket
router.get("/", asyncHandler(getBasket));

// GET /api/basket/summary - Get basket summary (item count and total)
router.get("/summary", asyncHandler(getBasketSummary));

// POST /api/basket/sync - Sync basket with current product availability and prices
router.post("/sync", asyncHandler(syncBasket));

// POST /api/basket - Add item to basket
router.post("/", asyncHandler(addToBasket));

// PUT /api/basket/item/:productId - Update item quantity in basket
router.put("/item/:productId", asyncHandler(updateBasketItem));

// DELETE /api/basket/item/:productId - Remove item from basket
router.delete("/item/:productId", asyncHandler(removeFromBasket));

// DELETE /api/basket - Clear entire basket
router.delete("/", asyncHandler(clearBasket));

module.exports = router;
