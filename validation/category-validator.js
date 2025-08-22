// utils/validations/category-validator.js
const Joi = require("joi");

const addCategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required().messages({
    "string.min": "Category name must be at least 2 characters long",
    "string.max": "Category name cannot exceed 50 characters",
    "string.empty": "Category name cannot be empty",
    "any.required": "Category name is required",
  }),
  description: Joi.string().trim().optional().allow("").max(500).messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
});

const editCategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().optional().messages({
    "string.min": "Category name must be at least 2 characters long",
    "string.max": "Category name cannot exceed 50 characters",
    "string.empty": "Category name cannot be empty",
  }),
  description: Joi.string().trim().optional().allow("").max(500).messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
});

module.exports = {
  addCategoryValidationSchema,
  editCategoryValidationSchema,
};
