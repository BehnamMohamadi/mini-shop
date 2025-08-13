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
