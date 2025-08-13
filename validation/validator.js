const { AppError } = require("../utils/app-error");

const validator = (validateSchema) => {
  return (req, res, next) => {
    const { error } = validateSchema.validate(req.body);
    if (!!error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      console.error("error in validator", error);
      return next(new AppError(400, errorMessage));
    }

    next();
  };
};

module.exports = { validator };
