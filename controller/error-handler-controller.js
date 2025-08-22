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

// Rate Limiting Error
const rateLimitError = () =>
  new AppError(429, "Too many requests. Please try again later");

const duplicateValidationError = ({ errorResponse }) => {
  // error.message.match(/(["'])(\\?.)*?\1/)

  const [key] = Object.keys(errorResponse.keyValue); //["username"]
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
