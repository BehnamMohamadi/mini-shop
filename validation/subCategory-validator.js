// utils/validations/subCategory-validator.js
const Joi = require("joi");

// ObjectId pattern for validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addSubCategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required().messages({
    "string.min": "SubCategory name must be at least 2 characters long",
    "string.max": "SubCategory name cannot exceed 50 characters",
    "string.empty": "SubCategory name cannot be empty",
    "any.required": "SubCategory name is required",
  }),
  category: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Category must be a valid ObjectId",
    "any.required": "Category is required",
  }),
  description: Joi.string().trim().optional().allow("").max(500).messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
});

const editSubCategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().optional().messages({
    "string.min": "SubCategory name must be at least 2 characters long",
    "string.max": "SubCategory name cannot exceed 50 characters",
    "string.empty": "SubCategory name cannot be empty",
  }),
  category: Joi.string().pattern(objectIdPattern).optional().messages({
    "string.pattern.base": "Category must be a valid ObjectId",
  }),
  description: Joi.string().trim().optional().allow("").max(500).messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
});

module.exports = {
  addSubCategoryValidationSchema,
  editSubCategoryValidationSchema,
};
