//user-controler.js
const User = require("../models/user-model");
const { AppError } = require("../utils/app-error");
const { ApiFeatures } = require("../utils/api-features");

const getUserById = async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(404, `user (id: ${userId}) not found`));
  }

  res.status(200).json({
    status: "success",
    data: { user },
  });
};

const getAllUsers = async (req, res, next) => {
  const userModel = new ApiFeatures(
    User.find({}).select("_id firstname lastname username role createdAt"),
    req.query
  )
    .sort()
    .filter()
    .paginate()
    .limitFields();

  const users = await userModel.model;

  const totalModels = new ApiFeatures(User.find({}), req.query).filter();
  const total = await totalModels.model;

  const { page = 1, limit = 10 } = req.query;

  res.status(200).json({
    status: "success",
    page: Number(page),
    perpage: Number(limit),
    total: total.length,
    totalPages: Math.ceil(total.length / Number(limit)),
    data: { users },
  });
};

const addUser = async (req, res, next) => {
  const {
    firstname = null,
    lastname = null,
    username = null,
    password = null,
    role = "customer",
  } = req.body;

  const duplicateUsername = await User.findOne({ username });
  if (!!duplicateUsername) {
    return next(
      new AppError(409, "username is already exists, use a different username")
    );
  }

  const user = await User.create({
    firstname,
    lastname,
    username,
    password,
    role,
  });

  res.status(201).json({
    status: "success",
    data: { user },
  });
};

const editUserById = async (req, res, next) => {
  const { userId } = req.params;

  const {
    firstname = null,
    lastname = null,
    gender = null,
    username = null,
    phonenumber = "",
    address = null,
  } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError(404, `user (id: ${userId}) not found`));
  }

  const duplicateUsername = await User.findOne({
    username,
    _id: { $ne: user._id },
  });
  if (!!duplicateUsername) {
    return next(
      new AppError(409, "username is already exists, use a different username")
    );
  }

  const duplicatePhonenumber = await User.findOne({
    phonenumber,
    _id: { $ne: user._id },
  });
  if (!!duplicatePhonenumber) {
    return next(
      new AppError(409, "phonenumber is already exists, use a different phonenumber")
    );
  }

  user.firstname = firstname ?? user.firstname;
  user.lastname = lastname ?? user.lastname;
  user.username = username ?? user.username;
  user.address = address ?? user.address;
  user.phonenumber = phonenumber ?? user.phonenumber;

  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    status: "success",
    data: { user },
  });
};

const deleteUserById = async (req, res, next) => {
  const { userId } = req.params;

  await User.findByIdAndDelete(userId);

  res.status(204).json({
    status: "success",
    data: null,
  });
};

const promoteUserToAdmin = async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return next(new AppError(409, `user with id${userId} not-found`));
  }

  if (user.role === role) {
    return next(new AppError(400, "this user is already an admin"));
  }

  user.role = role;
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({ status: "success", data: { message: "role has been changed" } });
};

module.exports = {
  addUser,
  getAllUsers,
  getUserById,
  editUserById,
  deleteUserById,
  promoteUserToAdmin,
};
