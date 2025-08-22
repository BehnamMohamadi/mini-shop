// utils/validations/product-validator.js
const Joi = require("joi");

// ObjectId pattern for validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addProductValidationSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required().messages({
    "string.min": "Product name must be at least 2 characters long",
    "string.max": "Product name cannot exceed 100 characters",
    "string.empty": "Product name cannot be empty",
    "any.required": "Product name is required",
  }),
  description: Joi.string().min(10).max(2000).trim().required().messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 2000 characters",
    "string.empty": "Description cannot be empty",
    "any.required": "Description is required",
  }),
  price: Joi.number().positive().precision(2).required().messages({
    "number.positive": "Price must be a positive number",
    "number.base": "Price must be a valid number",
    "any.required": "Price is required",
  }),
  quantity: Joi.number().integer().min(0).required().messages({
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity cannot be negative",
    "number.base": "Quantity must be a valid number",
    "any.required": "Quantity is required",
  }),
  brand: Joi.string().min(2).max(50).trim().required().messages({
    "string.min": "Brand must be at least 2 characters long",
    "string.max": "Brand cannot exceed 50 characters",
    "string.empty": "Brand cannot be empty",
    "any.required": "Brand is required",
  }),
  category: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Category must be a valid ObjectId",
    "any.required": "Category is required",
  }),
  subCategory: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "SubCategory must be a valid ObjectId",
    "any.required": "SubCategory is required",
  }),
  specifications: Joi.object().optional().messages({
    "object.base": "Specifications must be an object",
  }),
  tags: Joi.array().items(Joi.string().min(1).max(30).trim()).optional().messages({
    "array.base": "Tags must be an array",
    "string.min": "Each tag must be at least 1 character long",
    "string.max": "Each tag cannot exceed 30 characters",
  }),
  discount: Joi.number().min(0).max(100).optional().messages({
    "number.min": "Discount cannot be negative",
    "number.max": "Discount cannot exceed 100%",
    "number.base": "Discount must be a valid number",
  }),
});

const editProductValidationSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().optional().messages({
    "string.min": "Product name must be at least 2 characters long",
    "string.max": "Product name cannot exceed 100 characters",
    "string.empty": "Product name cannot be empty",
  }),
  description: Joi.string().min(10).max(2000).trim().optional().messages({
    "string.min": "Description must be at least 10 characters long",
    "string.max": "Description cannot exceed 2000 characters",
    "string.empty": "Description cannot be empty",
  }),
  price: Joi.number().positive().precision(2).optional().messages({
    "number.positive": "Price must be a positive number",
    "number.base": "Price must be a valid number",
  }),
  quantity: Joi.number().integer().min(0).optional().messages({
    "number.integer": "Quantity must be an integer",
    "number.min": "Quantity cannot be negative",
    "number.base": "Quantity must be a valid number",
  }),
  brand: Joi.string().min(2).max(50).trim().optional().messages({
    "string.min": "Brand must be at least 2 characters long",
    "string.max": "Brand cannot exceed 50 characters",
    "string.empty": "Brand cannot be empty",
  }),
  category: Joi.string().pattern(objectIdPattern).optional().messages({
    "string.pattern.base": "Category must be a valid ObjectId",
  }),
  subCategory: Joi.string().pattern(objectIdPattern).optional().messages({
    "string.pattern.base": "SubCategory must be a valid ObjectId",
  }),
  specifications: Joi.object().optional().messages({
    "object.base": "Specifications must be an object",
  }),
  tags: Joi.array().items(Joi.string().min(1).max(30).trim()).optional().messages({
    "array.base": "Tags must be an array",
    "string.min": "Each tag must be at least 1 character long",
    "string.max": "Each tag cannot exceed 30 characters",
  }),
  discount: Joi.number().min(0).max(100).optional().messages({
    "number.min": "Discount cannot be negative",
    "number.max": "Discount cannot exceed 100%",
    "number.base": "Discount must be a valid number",
  }),
});

module.exports = {
  addProductValidationSchema,
  editProductValidationSchema,
};
