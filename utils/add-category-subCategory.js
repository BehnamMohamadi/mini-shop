// utils/add-category-subCategory.js
const { asyncHandler } = require("./async-handler");
const Category = require("../models/category-model");
const SubCategory = require("../models/subCategory-model");

const categories = ["grocery", "electric"];
const subCategories = [
  { name: "legumes", categoryName: "grocery" },
  { name: "dairy", categoryName: "grocery" },
  { name: "protein", categoryName: "grocery" },
  { name: "smartPhone", categoryName: "electric" },
  { name: "laptop", categoryName: "electric" },
  { name: "tv", categoryName: "electric" },
];

const addCategoryAndSubCategory = asyncHandler(async () => {
  for (const categoryName of categories) {
    const isCategoryExists = await Category.findOne({ name: categoryName });
    if (!isCategoryExists) {
      await Category.create({ name: categoryName });
    }
  }

  for (const sub of subCategories) {
    const isSubCategoryExist = await SubCategory.findOne({ name: sub.name });
    if (!isSubCategoryExist) {
      const relatedCategory = await Category.findOne({ name: sub.categoryName });
      if (relatedCategory) {
        await SubCategory.create({
          name: sub.name,
          category: relatedCategory._id,
        });
      } else {
        console.warn(
          `[-] category ${sub.categoryName} not found for sub-category ${sub.name}`
        );
      }
    }
  }

  console.log("[+] Categories and SubCategories seeded successfully");
});

module.exports = { addCategoryAndSubCategory };
