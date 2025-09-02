// validation/basket-validator.js
const Joi = require("joi");

// ObjectId pattern for validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addToBasketValidationSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required(),
  count: Joi.number().integer().min(1).max(100),
});

const updateBasketItemValidationSchema = Joi.object({
  count: Joi.number().integer().min(0).max(100).required(),
});

const syncBasketValidationSchema = Joi.object({
  items: Joi.object()
    .pattern(
      Joi.string().pattern(objectIdPattern),
      Joi.number().integer().min(1).max(100)
    )
    .required(),
});

const updateBasketStatusValidationSchema = Joi.object({
  status: Joi.string().valid("open", "pending", "finished").required(),
});

module.exports = {
  addToBasketValidationSchema,
  updateBasketItemValidationSchema,
  syncBasketValidationSchema,
  updateBasketStatusValidationSchema,
};
