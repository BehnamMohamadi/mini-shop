const asyncHandler = (asyncFn) => (req, res, next) => {
  asyncFn(req, res, next).catch(next);
};

module.exports = { asyncHandler };
