// utils/validations/basket-validator.js
const Joi = require("joi");

// ObjectId pattern for validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addToBasketValidationSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Product ID must be a valid ObjectId",
    "any.required": "Product ID is required",
  }),
  count: Joi.number().integer().min(1).max(100).default(1).messages({
    "number.integer": "Count must be an integer",
    "number.min": "Count must be at least 1",
    "number.max": "Count cannot exceed 100",
  }),
});

const updateBasketItemValidationSchema = Joi.object({
  count: Joi.number().integer().min(0).max(100).required().messages({
    "number.integer": "Count must be an integer",
    "number.min": "Count cannot be negative",
    "number.max": "Count cannot exceed 100",
    "any.required": "Count is required",
  }),
});

const syncBasketValidationSchema = Joi.object({
  items: Joi.object()
    .pattern(
      Joi.string().pattern(objectIdPattern),
      Joi.number().integer().min(1).max(100)
    )
    .required()
    .messages({
      "object.pattern.match": "Items must contain valid product IDs and counts",
      "any.required": "Items object is required",
    }),
});

module.exports = {
  addToBasketValidationSchema,
  updateBasketItemValidationSchema,
  syncBasketValidationSchema,
};
