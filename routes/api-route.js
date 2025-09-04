//api-route.js - Updated to include basket routes
const router = require("express").Router();

const authRouter = require("./auth-route");
const userRouter = require("./user-route");
const accountRouter = require("./account-route");
const categoryRouter = require("./category-route");
const subCategoriesRouter = require("./subCategory-route");
const basketRouter = require("./basketRoutes/basket-route");
const productRouter = require("./productRoutes/product-route");
const wishlistRouter = require("./wishlist-routes");

router.use("/auth", authRouter);

router.use("/users", userRouter);

router.use("/account", accountRouter);

router.use("/products", productRouter);

router.use("/categories", categoryRouter);

router.use("/sub-categories", subCategoriesRouter);

router.use("/basket", basketRouter);

router.use("/wishlist", wishlistRouter);

module.exports = router;
