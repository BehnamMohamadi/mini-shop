// models/basket-model.js - Updated with status property

const { Schema, model } = require("mongoose");

const basketSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },

    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        count: {
          type: Number,
          required: [true, "Product count is required"],
          min: [1, "Count must be at least 1"],
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    status: {
      type: String,
      enum: {
        values: ["open", "pending", "finished"],
        message: "Status must be one of: open, pending, finished",
      },
      default: "open",
      required: [true, "Basket status is required"],
    },

    totalPrice: {
      type: Number,
      default: 0,
      min: [0, "Total price cannot be negative"],
    },

    totalItems: {
      type: Number,
      default: 0,
      min: [0, "Total items cannot be negative"],
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

basketSchema.pre("save", async function (next) {
  let totalPrice = 0;
  let totalItems = 0;

  if (this.products.length > 0) {
    const { products } = await this.populate("products.product", { price: 1 });

    for (const { product, count } of products) {
      if (product && product.price) {
        totalPrice += product.price * count;
        totalItems += count;
      }
    }
  }

  this.totalPrice = totalPrice;
  this.totalItems = totalItems;
  this.lastUpdated = new Date();

  next();
});

basketSchema.methods.addItem = async function (productId, count) {
  if (this.status !== "open") {
    throw new Error("Cannot add items to a basket that is not open");
  }
  let existingItem = null;

  for (let item of this.products) {
    if (item.product.toString() === productId.toString()) {
      existingItem = item;
      break;
    }
  }

  if (existingItem) {
    existingItem.count += count;
  } else {
    this.products.push({
      product: productId,
      count: count,
    });
  }

  return this.save();
};

basketSchema.methods.updateItemCount = async function (productId, count) {
  if (this.status !== "open") {
    throw new Error("Cannot add items to a basket that is not open");
  }
  let itemFound = false;

  for (let i = 0; i < this.products.length; i++) {
    if (this.products[i].product.toString() === productId.toString()) {
      if (count <= 0) {
        this.products.splice(i, 1);
      } else {
        this.products[i].count = count;
      }
      itemFound = true;
      break;
    }
  }

  if (!itemFound) {
    throw new Error("Item not found in basket");
  }

  return this.save();
};

basketSchema.methods.removeItem = async function (productId) {
  if (this.status !== "open") {
    throw new Error("Cannot add items to a basket that is not open");
  }
  const newProducts = [];

  for (let item of this.products) {
    if (item.product.toString() !== productId.toString()) {
      newProducts.push(item);
    }
  }

  this.products = newProducts;
  return this.save();
};

basketSchema.methods.clearBasket = async function () {
  if (this.status !== "open") {
    throw new Error("Cannot add items to a basket that is not open");
  }
  this.products = [];
  return this.save();
};

basketSchema.methods.updateStatus = async function (newStatus) {
  this.status = newStatus;
  return this.save();
};

basketSchema.statics.findOrCreateBasket = async function (userId) {
  let basket = await this.findOne({ user: userId }).populate("products.product");

  if (!basket) {
    basket = await this.create({ user: userId, products: [] });
    basket = await this.findById(basket._id).populate("products.product");
  }

  return basket;
};

const Basket = model("Basket", basketSchema);

module.exports = Basket;

//category-model.js

const { Schema, model } = require("mongoose");

const allowedCategories = process.env.SEED_PRODUCTS_CATEGORIES;

const CategorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: allowedCategories,
    },
    icon: {
      type: String,
      default: "default-icon.jpeg",
    },
  },
  { timestamps: true }
);

// CategorySchema.pre("save", function (next) {
//   const icons = {
//     grocery: "grocery-icon.jpeg",
//     electric: "electric-icon.jpeg",
//   };

//   this.icon = icons[this.name] || "default-icon.jpeg";
//   next();
// });

module.exports = model("Category", CategorySchema);

//product-model.js

const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");

const ProductSchema = new Schema(
  {
    name: { type: String, unique: true, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    brand: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, default: "default-thumbnail.jpeg" },
    images: [String],
    rating: {
      totalVotes: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = model("Product", ProductSchema);

//subcategory-model.js

const mongoose = require("mongoose");
const { Schema, model } = require("mongoose");

const allowedSubCategories = process.env.SEED_PRODUCTS_SUBCATEGORIES;

const SubCategorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: allowedSubCategories,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  icon: {
    type: String,
    default: "default-sub-icon.jpeg",
  },
});

// SubCategorySchema.pre("save", function (next) {
//   const icons = {
//     legumes: "legumes-icon.jpeg",
//     dairy: "dairy-icon.jpeg",
//     protein: "protein-icon.jpeg",
//     smartPhone: "smartPhone-icon.jpeg",
//     laptop: "laptop-icon.jpeg",
//     tv: "tv-icon.jpeg",
//   };

//   this.icon = icons[this.name] || "default-sub-icon.jpeg";
//   next();
// });

module.exports = model("SubCategory", SubCategorySchema);
const { Schema, model } = require("mongoose");
const { isEmail, isMobilePhone } = require("validator");
const bcrypt = require("bcrypt");

const UserSchema = new Schema(
  {
    firstname: {
      type: String,
      minlength: [3, "firstname must be atleast 3 charector"],
      maxlength: [30, "firstname must be maximum 30 charector"],
      required: [true, "firstname is required"],
      trim: true,
    },
    lastname: {
      type: String,
      minlength: [3, "lastname must be atleast 3 charector"],
      maxlength: [30, "lastname must be maximum 30 charector"],
      required: [true, "lastname is required"],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      validate: { validator: (value) => isEmail(value) },
      required: [true, "email is required"],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [8, "password must be at least 8 charector"],
      validate: {
        validator: (pass) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pass),
        message: "password must be have atleast one char or one number",
      },
      required: [true, "password is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ["customer", "admin"],
        message: "role is eather customer or admin",
      },
      default: "customer",
      trim: true,
      lowercase: true,
    },

    phonenumber: {
      type: String,
      default: "",

      validate: {
        validator: (value) => {
          if (value === "") return true;
          return isMobilePhone(value, "fa-IR");
        },
        message: "Provide a valid phone number",
      },
    },

    address: {
      type: String,
      trim: true,
      default: "tehran",
    },

    profile: {
      type: String,
      default: "users-default-profile.jpeg",
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  try {
    if (!this.passwordChangedAt) return false;

    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  } catch (error) {
    console.error("Error in changedPasswordAfter:", error);
    return true;
  }
};

module.exports = model("User", UserSchema);

const { Schema, Model } = require("mongoose");

const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        count: { type: Number, required: [true, "product count is required"] },
      },
    ],

    totalPrice: { type: Number, default: 0, min: [0, "Total amount cannot be negative"] },
  },
  {
    timestamps: true,
  }
);

// {
//   user:"2222ew232222222",
//   products:[{product:"e2321we22",count:3},...],-->[{product:{price:"555"},count:3}]
//   totalPrice:0
// }

order.pre("save", async function (next) {
  let total = 0;

  const { products } = await this.populate("products.product", { price: 1 });

  for (const { product, count } of products) {
    total += product.price * count;
  }

  this.totalPrice = total;

  next;
});

//database-connection.js
const { connect, connection } = require(`mongoose`);

const connectToDatabase = async () => {
  try {
    await connect(process.env.DATABASE_URL);
  } catch (err) {
    console.error("[-] database connection >", err);
    console.info("[i] process terminated.");
    process.exit(1);
  }
};

connection.once("connected", () => {
  console.log("[+] database connected.");
});

connection.on("disconnected", () => {
  console.info("[i] database disconnected.");
});

connection.on("reconnected", () => {
  console.log("[+] database reconnected.");
});

connection.on("error", (err) => {
  console.error("[-] database error >", err);
});

module.exports = { connectToDatabase };

// controllers/view-controller.js

const path = require("node:path");
const {
  getProductsGroupedByCategoryAndSubCategory,
} = require("../controller/product-controllers/product-controller");

const renderLoginPage = (req, res, next) => {
  if (res.locals.user) return res.redirect("/shop");

  res.render(path.join(__dirname, "../views/login.ejs"));
};

const renderSignUpPage = (req, res, next) => {
  if (res.locals.user) return res.redirect("/shop");

  res.render(path.join(__dirname, "../views/signup.ejs"));
};

const renderShopPage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/shop.ejs"), { user: res.locals.user });
};

const renderProfilePage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/profile.ejs"), { user: res.locals.user });
};

const renderStorePage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/store.ejs"), {
    groupedProducts: getProductsGroupedByCategoryAndSubCategory,
  });
};

const renderProductLandingPage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/product-landing-page.ejs"));
};

const renderSingleProductPage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/product-detail.ejs"));
};

const renderBasketPage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/basket.ejs"), { user: req.user });
};

const renderProductDetailPage = async (req, res, next) => {
  const { productId } = req.params;

  res.render(path.join(__dirname, "../views/product-detail.ejs"), {
    productId,
    user: res.locals.user,
  });
};

const renderAdminPanelPage = async (req, res, next) => {
  res.render(path.join(__dirname, "../views/admin-panel.ejs"));
};

module.exports = {
  renderLoginPage,
  renderShopPage,
  renderSignUpPage,
  renderProfilePage,
  renderStorePage,
  renderProductLandingPage,
  renderSingleProductPage,
  renderBasketPage,
  renderProductDetailPage,
  renderAdminPanelPage,
};

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

  if (icon && subcategory.icon !== "default-sub-icon.jpeg") {
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
const { AppError } = require("../utils/app-error");

const jwtExpiredError = () =>
  new AppError(401, "Your session has expired. Please log in again");

const jwtError = () =>
  new AppError(401, "Invalid authentication token. Please log in again");

const mongooseValidationError = (errors) => {
  const validationErrors = Object.values(errors)
    .map((item) => item.message)
    .join(", ");

  const errorMessage = `ValidationError: ${validationErrors}`;

  return new AppError(400, errorMessage);
};

const mongoConnectionError = () =>
  new AppError(500, "Database connection failed. Please try again later");

const rateLimitError = () =>
  new AppError(429, "Too many requests. Please try again later");

const duplicateValidationError = ({ errorResponse }) => {
  const [key] = Object.keys(errorResponse.keyValue);
  const value = errorResponse.keyValue[key];

  const errorMessage = `duplicate : ${key}}: ${value}`;

  return new AppError(409, errorMessage);
};

function globalErrorHandler(err, req, res, next) {
  // console.log(err);

  if (err.name === "TokenExpiredError") err = jwtExpiredError();
  if (err.name === "JsonWebTokenError") err = jwtError();
  if (err.name === "ValidationError") err = mongooseValidationError(err.errors);
  if (err.code === 11000) err = duplicateValidationError(err);

  if (err.name === "MongoNetworkError") err = mongoConnectionError();
  if (err.name === "RateLimitError") err = rateLimitError();

  // console.log(err.name);

  const { statusCode = 500, status = "error", message = "internal app error" } = err;

  res.status(statusCode).json({ status, message });
}

module.exports = { globalErrorHandler };
//category-controler.js

const Category = require("../models/category-model");
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

const deleteCategoryById = async (req, res, next) => {
  const { categoryId } = req.params;

  //delete subcategories related by this category

  //delete icon category & subcategory icon

  const category = await Category.findByIdAndDelete(categoryId);
  if (!category) {
    return next(new AppError(404, `category (id: ${categoryId}) not found`));
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
//auth-controller.js - Fixed Version
const User = require("../models/user-model");
const { AppError } = require("../utils/app-error");
const jwt = require("jsonwebtoken");
const { promisify } = require("node:util");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const sendToken = (user, statusCode, response) => {
  const token = signToken(user._id);

  response.cookie("jwt", token, {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "lax",
  });

  response.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

const login = async (req, res, next) => {
  if (!!req.cookies.jwt) {
    return next(new AppError(400, "you were logged in "));
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return next(new AppError(400, "invalid username or password"));
  }

  const user = await User.findOne({ username });
  if (!user) {
    return next(new AppError(401, "username or password is not valid{username}"));
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new AppError(401, "username or password is not valid {password}"));
  }

  sendToken(user, 200, res);
};

const signup = async (req, res, next) => {
  const { authorization = null } = req.headers;

  if (!!req.cookies.jwt) {
    return next(new AppError(400, "you were logged in "));
  } else if (!!authorization && authorization?.startsWith("Bearer")) {
    return next(new AppError(400, "you were logged in "));
  }

  const { firstname, lastname, username, password } = req.body;

  const usernameExists = await User.exists({ username });
  if (!!usernameExists) {
    return next(new AppError(409, "this username is already exist"));
  }

  const user = await User.create({
    firstname,
    lastname,
    username,
    password,
    role: "customer",
  });

  sendToken(user, 201, res);
};

const protect = async (req, res, next) => {
  const { authorization = null } = req.headers;

  let token = null;

  // Check for token in cookies first (preferred for browser requests)
  if (!!req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (!!authorization && authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ").at(1);
  }

  console.log("Token found:", !!token);

  if (!token) {
    return next(new AppError(401, "you are not logged in"));
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id).select(
      "-password  -__v -createdAt -updatedAt"
    );
    if (!currentUser) {
      return next(new AppError(401, "the user belong to this token does not exist"));
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(401, "password has been changed please try to login at first")
      );
    }

    req.user = currentUser;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return next(new AppError(401, "Invalid token"));
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "fail",
        data: { message: "you do not have permission to perform this action" },
      });
    }

    next();
  };
};

const isLoggedIn = async (req, res, next) => {
  if (!req.cookies.jwt) return next();

  try {
    const token = req.cookies.jwt;

    const { id: userId } = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        status: "fail",
        data: { message: "the user belonging to this token does no longer exist" },
      });
    }

    res.locals.user = user;
    next();
  } catch (error) {
    console.error("isLoggedIn error:", error);
    return next();
  }
};

const logout = (req, res, next) => {
  const { authorization = null } = req.headers;

  //delete previouse token
  if (!req.cookies.jwt) {
    return next(new AppError(400, "you were not logged in "));
  }

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "lax",
  });
  res.status(200).json({ status: "success", data: null });
};

module.exports = {
  login,
  signup,
  logout,
  protect,
  isLoggedIn,
  restrictTo,
};
//account-controler.js

const { join } = require("node:path");
const User = require("../models/user-model");
const { AppError } = require("../utils/app-error");
const { access, constants, unlink } = require("node:fs/promises");
const sharp = require("sharp");
const { multerUpload } = require("../utils/multer-config");

const getUserAccount = async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
};

const editUserAccount = async (req, res, next) => {
  const {
    firstname = null,
    lastname = null,
    username = null,
    address = null,
    phonenumber = "",
  } = req.body;

  const duplicateUsername = await User.findOne({
    username,
    _id: { $ne: req.user._id },
  });
  if (!!duplicateUsername) {
    return next(
      new AppError(409, "username is already exists, use a different username")
    );
  }

  if (phonenumber) {
    const duplicatePhonenumber = await User.findOne({
      phonenumber,
      _id: { $ne: req.user._id },
    });
    if (!!duplicatePhonenumber) {
      return next(
        new AppError(409, "phonenumber is already exists, use a different phonenumber")
      );
    }
  }

  req.user.firstname = firstname ?? req.user.firstname;
  req.user.lastname = lastname ?? req.user.lastname;
  req.user.username = username ?? req.user.username;
  req.user.phonenumber = phonenumber ?? req.user.phonenumber;
  req.user.address = address ?? req.user.address;

  await req.user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
};

const deleteUserAccount = async (req, res, next) => {
  await User.findByIdAndDelete(req.user._id);

  res.clearCookie("jwt");

  res.status(204).json({ status: "success", data: null });
};

const uploadUserAvatar = multerUpload.single("profile");

const resizeUserAvatar = async (userId, file = null) => {
  if (!file) return file;

  const userAvatarFilename = `users-${userId}-${Date.now()}.jpeg`;

  await sharp(file.buffer)
    .resize(100, 100)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(join(__dirname, `../public/images/profiles/${userAvatarFilename}`));

  return userAvatarFilename;
};

const changeProfileImage = async (req, res, next) => {
  const profile = await resizeUserAvatar(req.user._id, req.file);

  console.log(req.user.profile);

  if (!!profile && req.user.profile !== "users-default-profile.jpeg") {
    await access(
      join(__dirname, `../public/images/profiles/${req.user.profile}`),
      constants.F_OK
    );

    await unlink(join(__dirname, `../public/images/profiles/${req.user.profile}`));
  }

  req.user.profile = profile ?? req.user.profile;
  await req.user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: { user: req.user },
  });
};

module.exports = {
  getUserAccount,
  editUserAccount,
  deleteUserAccount,
  changeProfileImage,
  uploadUserAvatar,
};
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

  if (!!category) {
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return next(new AppError(400, "Category not found with this ID"));
    }
  }

  if (!!subCategory) {
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
// controller/basket-controller.js - Updated for simplified basket model
const Basket = require("../../models/basket-model");
const Product = require("../../models/product-model");
const { AppError } = require("../../utils/app-error");
const { ApiFeatures } = require("../../utils/api-features");

const getBasket = async (req, res, next) => {
  const basket = await Basket.findOrCreateBasket(req.user._id);

  res.status(200).json({
    status: "success",
    data: { basket },
  });
};

const getAllBaskets = async (req, res, next) => {
  const basketModel = new ApiFeatures(
    Basket.find({}).populate("user", "firstname lastname username"),
    req.query
  )
    .sort()
    .filter()
    .paginate()
    .limitFields();

  const baskets = await basketModel.model.populate(
    "products.product",
    "name price thumbnail"
  );

  const totalModels = new ApiFeatures(Basket.find({}), req.query).filter();
  const total = await totalModels.model;

  const { page = 1, limit = 10 } = req.query;

  res.status(200).json({
    status: "success",
    page: Number(page),
    perpage: Number(limit),
    total: total.length,
    totalPages: Math.ceil(total.length / Number(limit)),
    data: { baskets },
  });
};

const addToBasket = async (req, res, next) => {
  const { productId, count = 1 } = req.body;

  if (!productId) {
    return next(new AppError(400, "Product ID is required"));
  }

  if (count < 1) {
    return next(new AppError(400, "Count must be at least 1"));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError(404, "Product not found"));
  }

  if (product.quantity <= 0) {
    return next(new AppError(400, "Product is out of stock"));
  }

  try {
    const basket = await Basket.findOrCreateBasket(req.user._id);

    const existingItem = basket.products.find(
      (item) => item.product._id.toString() === productId.toString()
    );

    const currentCountInBasket = existingItem ? existingItem.count : 0;
    const totalCountAfterAdd = currentCountInBasket + count;

    if (totalCountAfterAdd > product.quantity) {
      const availableToAdd = product.quantity - currentCountInBasket;
      return next(
        new AppError(
          400,
          `Cannot add ${count} items. Only ${availableToAdd} more available (Total stock: ${product.quantity}, Currently in basket: ${currentCountInBasket})`
        )
      );
    }

    await basket.addItem(productId, count);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `Added ${count} item(s) to basket`,
    });
  } catch (error) {
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "Cannot add items to basket. Basket is not in open status")
      );
    }
    throw error;
  }
};

const updateBasketItem = async (req, res, next) => {
  const { productId } = req.params;
  const { count } = req.body;

  if (count < 0) {
    return next(new AppError(400, "Count cannot be negative"));
  }

  try {
    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    if (count === 0) {
      await basket.removeItem(productId);
      const updatedBasket = await Basket.findById(basket._id).populate(
        "products.product"
      );
      return res.status(200).json({
        status: "success",
        data: { basket: updatedBasket },
        message: "Item removed from basket",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError(404, "Product not found"));
    }

    if (count > product.quantity) {
      return next(
        new AppError(
          400,
          `Insufficient stock. Only ${product.quantity} items available in inventory`
        )
      );
    }

    await basket.updateItemCount(productId, count);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `Count updated to ${count}`,
    });
  } catch (error) {
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "Cannot update basket items. Basket is not in open status")
      );
    }
    throw error;
  }
};

const removeFromBasket = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    await basket.removeItem(productId);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: "Item removed from basket",
    });
  } catch (error) {
    console.error("Error in removeFromBasket:", error);
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(
        new AppError(400, "Cannot remove basket items. Basket is not in open status")
      );
    }
    return next(new AppError(500, "Error removing item from basket"));
  }
};

const clearBasket = async (req, res, next) => {
  try {
    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    await basket.clearBasket();

    const clearedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: clearedBasket },
      message: "Basket cleared successfully",
    });
  } catch (error) {
    if (error.message.includes("Cannot add items to a basket that is not open")) {
      return next(new AppError(400, "Cannot clear basket. Basket is not in open status"));
    }
    throw error;
  }
};

// Simple endpoint to update basket status
const updateBasketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !["open", "pending", "finished"].includes(status)) {
      return next(
        new AppError(400, "Valid status is required (open, pending, finished)")
      );
    }

    const basket = await Basket.findOne({ user: req.user._id });
    if (!basket) {
      return next(new AppError(404, "Basket not found"));
    }

    await basket.updateStatus(status);

    const updatedBasket = await Basket.findById(basket._id).populate("products.product");

    res.status(200).json({
      status: "success",
      data: { basket: updatedBasket },
      message: `Basket status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating basket status:", error);
    return next(new AppError(400, error.message));
  }
};

const getBasketSummary = async (req, res, next) => {
  const { status } = req.query;

  const query = { user: req.user._id };
  if (status) {
    query.status = status;
  }

  const basket = await Basket.findOne(query);

  if (!basket) {
    return res.status(200).json({
      status: "success",
      data: {
        totalItems: 0,
        totalPrice: 0,
        itemCount: 0,
        basketStatus: null,
      },
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      totalItems: basket.totalItems,
      totalPrice: basket.totalPrice,
      itemCount: basket.products.length,
      basketStatus: basket.status,
    },
  });
};

// Get user's basket history
const getBasketHistory = async (req, res, next) => {
  const baskets = await Basket.find({ user: req.user._id })
    .populate("products.product", "name price thumbnail")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    data: { baskets },
  });
};

module.exports = {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getBasketSummary,
  getAllBaskets,
  updateBasketStatus,
  getBasketHistory,
};
const router = require("express").Router();
const { protect, restrictTo } = require("../../controller/auth-controller.js");
const { asyncHandler } = require("../../utils/async-handler");
const { validator } = require("../../validation/validator");
const {
  addToBasketValidationSchema,
  updateBasketItemValidationSchema,
  updateBasketStatusValidationSchema,
} = require("../../validation/basket-validator");
const {
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  clearBasket,
  getAllBaskets,
  getBasketSummary,
  updateBasketStatus,
  getBasketHistory,
} = require("../../controller/basket-controllers/basket-controller");

// Admin only routes
router.get(
  "/get-all-baskets",
  asyncHandler(protect),
  restrictTo("admin"),
  asyncHandler(getAllBaskets)
);

// Apply authentication to all other routes
router.use(asyncHandler(protect), restrictTo("customer", "admin"));

// Basic basket operations
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

// Status management
router.patch(
  "/status",
  validator(updateBasketStatusValidationSchema),
  asyncHandler(updateBasketStatus)
);

// History
router.get("/history", asyncHandler(getBasketHistory));

module.exports = router;
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
//account-route.js   usersRoute
const router = require("express").Router();
const { protect } = require("../controller/auth-controller");
const { asyncHandler } = require("../utils/async-handler");
const { validator } = require("../validation/validator");
const {
  getUserAccount,
  editUserAccount,
  deleteUserAccount,
  changeProfileImage,
  uploadUserAvatar,
} = require("../controller/account-controller");
const { editAccountValidationSchema } = require("../validation/account-validator");

router.use(asyncHandler(protect));

router.get("/", asyncHandler(getUserAccount));

router.patch("/change-profile-image", uploadUserAvatar, asyncHandler(changeProfileImage));
router.patch("/", validator(editAccountValidationSchema), asyncHandler(editUserAccount));

router.delete("/", asyncHandler(deleteUserAccount));

module.exports = router;
//api-route.js - Updated to include basket routes
const router = require("express").Router();

const authRouter = require("./auth-route");
const userRouter = require("./user-route");
const accountRouter = require("./account-route");
const categoryRouter = require("./category-route");
const subCategoriesRouter = require("./subCategory-route");
const basketRouter = require("./basketRoutes/basket-route");

const productRouter = require("./productRoutes/product-route");

router.use("/auth", authRouter);

router.use("/users", userRouter);

router.use("/account", accountRouter);

router.use("/products", productRouter);

router.use("/categories", categoryRouter);

router.use("/sub-categories", subCategoriesRouter);

router.use("/basket", basketRouter);

module.exports = router;
//app-route.js
const router = require("express").Router();

const apiRouter = require("./api-route");
const viewRouter = require("./view-route");

router.use("/", viewRouter);
router.use("/api", apiRouter);

module.exports = router;
//auth-route.js
const router = require("express").Router();
const { signup, login, logout } = require("../controller/auth-controller");
const { asyncHandler } = require("../utils/async-handler");
const { validator } = require("../validation/validator");
const {
  signupValidationSchema,
  loginValidationSchema,
} = require("../validation/auth-validator");

// router.post("/signup", validator(signupValidationSchema), asyncHandler(signup));
router.post("/signup", asyncHandler(signup));
router.post("/login", validator(loginValidationSchema), asyncHandler(login));
router.get("/logout", logout);

module.exports = router;
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
//user-route.js adminsRoutes

const router = require("express").Router();
const { protect, restrictTo } = require("../controller/auth-controller");
const {
  getUserById,
  getAllUsers,
  addUser,
  editUserById,
  deleteUserById,
} = require("../controller/user-controller");
const { asyncHandler } = require("../utils/async-handler");

router.use(asyncHandler(protect), restrictTo("admin"));

router.get("/:userId", asyncHandler(getUserById));

router.get("/", asyncHandler(getAllUsers));

router.post("/", asyncHandler(addUser));

router.patch("/:userId", asyncHandler(editUserById));



router.delete("/:userId", asyncHandler(deleteUserById));


module.exports = router;
//view-route.js
const router = require("express").Router();
const {
  renderLoginPage,
  renderShopPage,
  renderSignUpPage,
  renderProfilePage,
  renderStorePage,
  renderProductLandingPage,
  renderSingleProductPage,
  renderBasketPage,
  renderProductDetailPage,
  renderAdminPanelPage,
} = require("../controller/view-controller");

const { isLoggedIn } = require("../controller/auth-controller");
const { asyncHandler } = require("../utils/async-handler");

router.get("/login", renderLoginPage);

router.get("/signup", renderSignUpPage);

router.get("/shop", isLoggedIn, renderShopPage);
router.get("/profile", isLoggedIn, renderProfilePage);

router.get("/store", asyncHandler(renderStorePage));

router.get("/product-landing-page", asyncHandler(renderProductLandingPage));

router.get("/product", isLoggedIn, renderSingleProductPage);
router.get("/basket", isLoggedIn, renderBasketPage);

router.get("/product/:productId", isLoggedIn, renderProductDetailPage);

router.get("/admin-panel", isLoggedIn, renderAdminPanelPage);

module.exports = router;


//utils/api-features.js
class ApiFeatures {
  constructor(model, queryString) {
    this.model = model;
    this.queryString = queryString;
  }

  sort() {
    const { sort: sortBy = "name" } = this.queryString;

    this.model = this.model.sort(sortBy);

    return this;
  }

  paginate() {
    const { page = 1, limit = 10 } = this.queryString;

    const skip = (page * 1 - 1) * (limit * 1);

    this.model = this.model.skip(skip).limit(limit * 1);

    return this;
  }

  limitFields() {
    const { fields = "-__v" } = this.queryString;

    this.model = this.model.select(fields.split(","));

    return this;
  }

  filter() {
    const { sort, page, limit, fields, ...filter } = this.queryString;

    const filterAsJson = JSON.stringify(filter).replace(
      /\b(gt|gte|lt|lte)\b/g,
      (match) => `$${match}`
    );

    this.model = this.model.find(JSON.parse(filterAsJson));

    return this;
  }
}

module.exports = { ApiFeatures };
//multer-config.js

const multer = require("multer");
const { AppError } = require("./app-error");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  file.mimetype.startsWith("image")
    ? cb(null, true)
    : cb(new AppError(400, "not an image format."), false);
};

const multerUpload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

module.exports = { multerUpload };
