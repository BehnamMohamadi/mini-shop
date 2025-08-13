const express = require("express");
const router = express.Router();

const {
  getAllSubCategories,
  getSubCategoryById,
  addSubCategory,
  editSubCategoryById,
  deleteSubCategoryById,
  uploadSubCategoryIcon,
  changeSubCategoryIcon,
} = require("../controller/subCategory-controller");

const { protect, restrictTo } = require("../controller/auth-controller");
const { asyncHandler } = require("../utils/async-handler");

router.use(asyncHandler(protect), restrictTo("admin"));

router.get("/", asyncHandler(getAllSubCategories));
router.get("/:subCategoryId", asyncHandler(getSubCategoryById));

router.post("/", asyncHandler(addSubCategory));

router.patch("/:subCategoryId", asyncHandler(editSubCategoryById));
router.delete("/:subCategoryId", asyncHandler(deleteSubCategoryById));

router.patch(
  "/change-icon/:subCategoryId",
  uploadSubCategoryIcon,
  asyncHandler(changeSubCategoryIcon)
);

module.exports = router;
