//auth-route.js
const router = require("express").Router();
const { signup, login, logout } = require("../controller/auth-controller");
const { asyncHandler } = require("../utils/async-handler");
const { validator } = require("../validation/validator");
const {
  signupValidationSchema,
  loginValidationSchema,
} = require("../validation/auth-validator");

router.post("/signup", validator(signupValidationSchema), asyncHandler(signup));
router.post("/login", validator(loginValidationSchema), asyncHandler(login));
router.get("/logout", logout);

module.exports = router;
