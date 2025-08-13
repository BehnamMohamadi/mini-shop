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
