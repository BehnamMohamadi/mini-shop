//product-controller.js

const Product = require("../../models/product-model");
const Category = require("../../models/category-model");
const SubCategory = require("../../models/subCategory-model");
const { AppError } = require("../../utils/app-error");
const { ApiFeatures } = require("../../utils/api-features");

const getAllProducts = async (req, res, next) => {
  const productModel = new ApiFeatures(Product.find({}), req.query)
    .sort()
    .filter()
    .paginate()
    .limitFields();

  const products = await productModel.model
    .populate("category", "name icon")
    .populate("subCategory", "name icon");

  const totalModels = new ApiFeatures(Product.find({}), req.query).filter();
  const total = await totalModels.model;

  const { page = 1, limit = 10 } = req.query;

  res.status(200).json({
    status: "success",
    page: Number(page),
    perpage: Number(limit),
    total: total.length,
    totalPages: Math.ceil(total.length / Number(limit)),
    data: { products },
  });
};

const getProductsGroupedByCategoryAndSubCategory = async (req, res, next) => {
  const products = await Product.find().populate("category").populate("subCategory");

  const groupedProducts = {};

  products.forEach((product) => {
    const { category, subCategory } = product;
    console.log(product);

    if (!groupedProducts[category]) {
      groupedProducts[category] = {};
    }

    if (!groupedProducts[category][subCategory]) {
      groupedProducts[category][subCategory] = [];
    }

    groupedProducts[category][subCategory].push(product);
  });

  res.status(200).json({ status: "success", data: groupedProducts });
};

const getProductById = async (req, res, next) => {
  const { productId } = req.params;

  const product = await Product.findById(productId)
    .populate("category")
    .populate("subCategory");
  if (!product) {
    return next(new AppError(404, `product (id: ${productId}) not found`));
  }

  res.status(200).json({ status: "success", data: product });
};

const addProduct = async (req, res, next) => {
  const {
    name = null,
    category = null,
    subCategory = null,
    price = null,
    quantity = null,
    brand = null,
    description = null,
    thumbnail = "default-thumbnail.jpeg",
    images = [],
  } = req.body;

  const duplicateName = await Product.findOne({ name });
  if (!!duplicateName) {
    return next(new AppError(409, "name is already exists, use a different name"));
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return next(new AppError(400, "Category not found with this ID"));
  }

  const subCategoryExists = await SubCategory.findById(subCategory);
  if (!subCategoryExists) {
    return next(new AppError(400, "SubCategory not found with this ID"));
  }

  if (subCategoryExists.category.toString() !== category._id) {
    return next(new AppError(409, "SubCategory or category not found"));
  }

  const product = await Product.create({
    name,
    category,
    subCategory,
    price,
    quantity,
    brand,
    description,
    thumbnail,
    images,
  });

  res.status(201).json({ status: "success", data: product });
};

const editProduct = async (req, res, next) => {
  const { productId } = req.params;
  const {
    name = null,
    category = null,
    subCategory = null,
    price = null,
    quantity = null,
    brand = null,
    description = null,
  } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(404, "Product not found"));
  }

  if (name && name !== product.name) {
    const duplicateName = await Product.findOne({
      name,
      _id: { $ne: productId },
    });

    if (duplicateName) {
      return next(new AppError(409, "Product name already exists"));
    }
  }

  if (category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return next(new AppError(400, "Category not found with this ID"));
    }
  }

  if (subCategory) {
    const subCategoryExists = await SubCategory.findById(subCategory);
    if (!subCategoryExists) {
      return next(new AppError(400, "SubCategory not found with this ID"));
    }
  }
  product.name = name ?? product.name;
  product.category = category ?? product.category;
  product.subCategory = subCategory ?? product.subCategory;
  product.price = price ?? product.price;
  product.quantity = quantity ?? product.quantity;
  product.brand = brand ?? product.brand;
  product.description = description ?? product.description;

  await product.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: { product },
  });
};

const deleteProduct = async (req, res, next) => {
  const { productId } = req.params;

  const deleted = await Product.findByIdAndDelete(productId);
  if (!deleted) {
    return next(new AppError(404, "Product not found"));
  }

  res.status(200).json({ status: "success", message: "Product deleted successfully" });
};

module.exports = {
  getProductById,
  getAllProducts,
  addProduct,
  editProduct,
  deleteProduct,
  getProductsGroupedByCategoryAndSubCategory,
};
