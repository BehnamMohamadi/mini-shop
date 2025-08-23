const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../../controller/auth-controller");
const { asyncHandler } = require("../../utils/async-handler");
const { validator } = require("../../validation/validator");

const {
  addProductValidationSchema,
  editProductValidationSchema,
} = require("../../validation/product-validator");
const {
  getProductById,
  getAllProducts,
  addProduct,
  editProduct,
  deleteProduct,
} = require("../../controller/product-controllers/product-controller");

router.get("/", asyncHandler(getAllProducts));
router.get("/:productId", asyncHandler(getProductById));

router.use(asyncHandler(protect), restrictTo("admin"));

router.post("/", validator(addProductValidationSchema), asyncHandler(addProduct));

router.put(
  "/:productId",
  validator(editProductValidationSchema),
  asyncHandler(editProduct)
);

router.delete("/:productId", asyncHandler(deleteProduct));

module.exports = router;
