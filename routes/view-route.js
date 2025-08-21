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

module.exports = router;
