//category-controler.js

const Category = require("../models/category-model");
const SubCategory = require("../models/subCategory-model");
const Product = require("../models/product-model");

const { AppError } = require("../utils/app-error");
const { join } = require("node:path");
const { access, constants, unlink } = require("node:fs/promises");
const sharp = require("sharp");
const { multerUpload } = require("../utils/multer-config");
const { ApiFeatures } = require("../utils/api-features");

const getAllCategories = async (req, res, next) => {
  const categoryModel = new ApiFeatures(Category.find({}), req.query)
    .sort()
    .filter()
    .paginate()
    .limitFields();

  const categories = await categoryModel.model;

  const totalModels = new ApiFeatures(Category.find({}), req.query).filter();
  const total = await totalModels.model;

  const { page = 1, limit = 10 } = req.query;

  res.status(200).json({
    status: "success",
    page: Number(page),
    perpage: Number(limit),
    total: total.length,
    totalPages: Math.ceil(total.length / Number(limit)),
    data: { categories },
  });
};

const getCategoryById = async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError(404, `category (id: ${categoryId}) not found`));
  }

  res.status(200).json({
    status: "success",
    data: { category },
  });
};

const addCategory = async (req, res, next) => {
  const { name } = req.body;

  const existing = await Category.findOne({ name });
  if (existing) {
    return next(new AppError(409, "category name already exists"));
  }

  const category = await Category.create({ name });

  res.status(201).json({
    status: "success",
    data: { category },
  });
};

const editCategoryById = async (req, res, next) => {
  const { categoryId } = req.params;
  const { name } = req.body;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError(404, `category (id: ${categoryId}) not found`));
  }

  const duplicate = await Category.findOne({ name, _id: { $ne: categoryId } });
  if (duplicate) {
    return next(new AppError(409, "category name already exists"));
  }

  category.name = name ?? category.name;

  await category.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: { category },
  });
};

const deleteIcon = async (icon, modelName) => {
  if (!icon || icon === "default-icon.jpeg") return;

  const path = join(
    __dirname,
    `../public/images/models-images/${modelName}-images/${icon}`
  );

  try {
    await access(path, constants.F_OK);
    await unlink(path);
  } catch (err) {
    console.error(` Failed to delete ${modelName} icon:`, err.message);
  }
};

const deleteCategoryById = async (req, res, next) => {
  const { categoryId } = req.params;

  // 1) Delete category
  const category = await Category.findByIdAndDelete(categoryId);
  if (!category) {
    return next(new AppError(404, `Category (id: ${categoryId}) not found`));
  }

  await deleteIcon(category.icon, "category");

  // 2) Delete subcategories and their icons
  const subCategories = await SubCategory.find({ category: categoryId });
  if (subCategories.length) {
    for (const sub of subCategories) {
      await SubCategory.findByIdAndDelete(sub._id);
      await deleteIcon(sub.icon, "subCategory");
    }
  }

  // 3) Delete products and their icons
  const products = await Product.find({ category: categoryId });
  if (products.length) {
    for (const p of products) {
      await Product.findByIdAndDelete(p._id);
      await deleteIcon(p.icon, "product");
    }
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
};

const uploadCategoryIcon = multerUpload.single("icon");

const resizeCategoryIcon = async (categoryId, file = null) => {
  if (!file) return null;

  const filename = `category-${categoryId}-${Date.now()}.jpeg`;
  const filepath = join(
    __dirname,
    `../public/images/models-images/category-images/${filename}`
  );

  await sharp(file.buffer)
    .resize(120, 120)
    .toFormat("jpeg")
    .jpeg({ quality: 85 })
    .toFile(filepath);

  return filename;
};

const changeCategoryIcon = async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    return next(new AppError(404, `category (id: ${categoryId}) not found`));
  }

  const icon = await resizeCategoryIcon(category._id, req.file);

  if (icon && category.icon !== "default-icon.jpeg") {
    const previousPath = join(
      __dirname,
      `../public/images/models-images/category-images/${category.icon}`
    );
    try {
      await access(previousPath, constants.F_OK);
      await unlink(previousPath);
    } catch (err) {
      //error handler
    }
  }

  category.icon = icon ?? category.icon;
  await category.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    message: "Category icon updated successfully",
    data: { category },
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  addCategory,
  editCategoryById,
  deleteCategoryById,
  uploadCategoryIcon,
  changeCategoryIcon,
};
