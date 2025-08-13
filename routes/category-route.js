const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  addCategory,
  editCategoryById,
  deleteCategoryById,
  uploadCategoryIcon,
  changeCategoryIcon,
} = require("../controller/category-controller");

const { protect, restrictTo } = require("../controller/auth-controller");
const { asyncHandler } = require("../utils/async-handler");

router.use(asyncHandler(protect), restrictTo("admin"));

router.get("/", asyncHandler(getAllCategories));
router.get("/:categoryId", asyncHandler(getCategoryById));

router.post("/", asyncHandler(addCategory));

router.patch("/:categoryId", asyncHandler(editCategoryById));
router.patch(
  "/chahge-icon/:categoryId",
  uploadCategoryIcon,
  asyncHandler(changeCategoryIcon)
);

router.delete("/:categoryId", asyncHandler(deleteCategoryById));

module.exports = router;
