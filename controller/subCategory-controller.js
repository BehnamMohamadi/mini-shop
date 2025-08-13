//subcategory-controler.js

const { join } = require("node:path");
const { access, constants, unlink } = require("node:fs/promises");
const sharp = require("sharp");

const SubCategory = require("../models/subCategory-model");
const Category = require("../models/category-model");

const { AppError } = require("../utils/app-error");
const { multerUpload } = require("../utils/multer-config");
const { ApiFeatures } = require("../utils/api-features");

const getAllSubCategories = async (req, res, next) => {
  const subCategoryModel = new ApiFeatures(SubCategory.find({}), req.query)
    .sort()
    .filter()
    .paginate()
    .limitFields();

  const subcategories = await subCategoryModel.model.populate("category");

  const totalModels = new ApiFeatures(SubCategory.find({}), req.query).filter();
  const total = await totalModels.model;

  const { page = 1, limit = 10 } = req.query;

  res.status(200).json({
    status: "success",
    page: Number(page),
    perpage: Number(limit),
    total: total.length,
    totalPages: Math.ceil(total.length / Number(limit)),
    data: { subcategories },
  });
};

const getSubCategoryById = async (req, res, next) => {
  const { subCategoryId } = req.params;

  const subcategory = await SubCategory.findById(subCategoryId).populate("category");
  if (!subcategory) {
    return next(new AppError(404, `subcategory (id: ${subCategoryId}) not found`));
  }

  res.status(200).json({
    status: "success",
    data: { subcategory },
  });
};

const addSubCategory = async (req, res, next) => {
  const { name, category } = req.body;

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    return next(new AppError(400, "Category not found with this ID"));
  }

  const exists = await SubCategory.findOne({ name });
  if (exists) {
    return next(new AppError(409, "This subcategory already exists"));
  }

  const subcategory = await SubCategory.create({ name, category });

  res.status(201).json({
    status: "success",
    data: { subcategory },
  });
};

const editSubCategoryById = async (req, res, next) => {
  const { subCategoryId } = req.params;
  let { name = null, category = null } = req.body;

  //check is category exist??

  const subcategory = await SubCategory.findById(subCategoryId);
  if (!subcategory) {
    return next(new AppError(404, `subcategory (id: ${subCategoryId}) not found`));
  }

  const duplicate = await SubCategory.findOne({ name, _id: { $ne: subCategoryId } });
  if (duplicate) {
    return next(new AppError(409, "This subcategory name is already taken"));
  }

  if (!!category) {
    const categoryExist = await Category.findById(category);

    if (!categoryExist) {
      return next(new AppError(409, "This category  is not valid "));
    }
  }

  // category  ??=  subcategory.category;
  // const categoryExist = await Category.findById(category);

  // if (!categoryExist) {
  //   return next(new AppError(409, "This category  is not valid "));
  // }

  subcategory.name = name ?? subcategory.name;
  subcategory.category = category ?? subcategory.category;

  await subcategory.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: { subcategory },
  });
};

const deleteSubCategoryById = async (req, res, next) => {
  const { subCategoryId } = req.params;

  const subcategory = await SubCategory.findByIdAndDelete(subCategoryId);
  if (!subcategory) {
    return next(new AppError(404, `subcategory (id: ${subCategoryId}) not found`));
  }

  res.status(204).json({ status: "success", data: null });
};

const uploadSubCategoryIcon = multerUpload.single("icon");

const resizeSubCategoryIcon = async (subCategoryId, file = null) => {
  if (!file) return null;

  const filename = `sub-${subCategoryId}-${Date.now()}.jpeg`;
  const filepath = join(
    __dirname,
    `../public/images/models-images/subCategory-images/${filename}`
  );

  await sharp(file.buffer)
    .resize(100, 100)
    .toFormat("jpeg")
    .jpeg({ quality: 85 })
    .toFile(filepath);

  return filename;
};

const changeSubCategoryIcon = async (req, res, next) => {
  const { subCategoryId } = req.params;

  const subcategory = await SubCategory.findById(subCategoryId);
  if (!subcategory) {
    return next(new AppError(404, `subcategory (id: ${subCategoryId}) not found`));
  }

  const icon = await resizeSubCategoryIcon(subcategory._id, req.file);

  if (icon && subcategory.icon && subcategory.icon !== "default-sub-icon.jpeg") {
    try {
      await access(
        join(
          __dirname,
          `../public/images/models-images/subCategory-images/${subcategory.icon}`
        ),
        constants.F_OK
      );
      await unlink(
        join(
          __dirname,
          `../public/images/models-images/subCategory-images/${subcategory.icon}`
        )
      );
    } catch (err) {}
  }

  subcategory.icon = icon ?? subcategory.icon;
  await subcategory.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    message: "Subcategory icon updated successfully",
    data: { subcategory },
  });
};

module.exports = {
  getAllSubCategories,
  getSubCategoryById,
  addSubCategory,
  editSubCategoryById,
  deleteSubCategoryById,
  uploadSubCategoryIcon,
  changeSubCategoryIcon,
};
