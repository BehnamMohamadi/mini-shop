function AppError(statusCode, errorMessage) {
  this.message = errorMessage;
  this.statusCode = statusCode;
  this.status = statusCode.toString().startsWith("4") ? "fail" : "error";

  Error.captureStackTrace(this);
}

module.exports = { AppError };
