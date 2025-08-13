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

module.exports = {
  renderLoginPage,
  renderShopPage,
  renderSignUpPage,
  renderProfilePage,
  renderStorePage,
  renderProductLandingPage,
  renderSingleProductPage,
  renderBasketPage,
};
