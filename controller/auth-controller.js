//auth-controller.js
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

  if (!!req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (!!authorization && authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ").at(1);
  }
  console.log(req.cookies.jwt);
  if (!token) {
    return next(new AppError(401, "you are not logged in"));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id).select(
    "-password  -__v -createdAt -updatedAt"
  );
  if (!currentUser) {
    return next(new AppError(401, "the user blong to this token not exist"));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(401, "password has been changed please try to login atfirst")
    );
  }
  req.user = currentUser;

  next();
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

  const token = req.cookies.jwt;

  const { id: userId } = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(userId);

  if (!user) {
    return res.status(401).json({
      status: "fail",
      data: { message: "the user blonging to this token does no longer exists" },
    });
  }

  res.locals.user = user;
  next();
};

const logout = (req, res, next) => {
  const { authorization = null } = req.headers;

  if (!req.cookies.jwt) {
    return next(new AppError(400, "you were logged in "));
  }

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "lax",
  });
  res.status(204).json({ status: "success", data: null });
};

module.exports = {
  login,
  signup,
  logout,
  protect,
  isLoggedIn,
  restrictTo,
};
