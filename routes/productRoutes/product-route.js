//product-route
const express = require("express");
const router = express.Router();
const {
  getProductById,
  getAllProducts,
  addProduct,
  editProduct,
  deleteProduct,
  getProductsGroupedByCategoryAndSubCategory,
} = require("../../controller/product-controllers/product-controller");
const { protect, restrictTo } = require("../../controller/auth-controller");
const { asyncHandler } = require("../../utils/async-handler");

router.get("/", getAllProducts);
// router.get("/", getProductsGroupedByCategoryAndSubCategory);
router.get("/:productId", getProductById);

router.use(asyncHandler(protect), restrictTo("admin"));
router.post("/", addProduct);
router.put("/:productId", editProduct);
router.delete("/:productId", deleteProduct);

module.exports = router;
