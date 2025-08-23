// utils/validations/product-validator.js
const Joi = require("joi");

// ObjectId pattern for validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addProductValidationSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  description: Joi.string().min(10).max(2000).trim().required(),
  price: Joi.number().positive().precision(2).required(),
  quantity: Joi.number().integer().min(0).required(),
  brand: Joi.string().min(2).max(50).trim().required(),
  category: Joi.string().pattern(objectIdPattern).required(),
  subCategory: Joi.string().pattern(objectIdPattern).required(),
  specifications: Joi.object().optional(),
  tags: Joi.array().items(Joi.string().min(1).max(30).trim()).optional(),
  discount: Joi.number().min(0).max(100).optional(),
});

const editProductValidationSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional(),
  description: Joi.string().min(10).max(2000).trim().optional(),
  price: Joi.number().positive().precision(2).optional(),
  quantity: Joi.number().integer().min(0).optional(),
  brand: Joi.string().min(2).max(50).trim().optional(),
  category: Joi.string().pattern(objectIdPattern).optional(),
  subCategory: Joi.string().pattern(objectIdPattern).optional(),
  specifications: Joi.object().optional(),
  tags: Joi.array().items(Joi.string().min(1).max(30).trim()).optional(),
  discount: Joi.number().min(0).max(100).optional(),
});

module.exports = {
  addProductValidationSchema,
  editProductValidationSchema,
};
