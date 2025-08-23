// utils/validations/subCategory-validator.js
const Joi = require("joi");

// ObjectId pattern for validation
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const addSubCategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().required(),
  category: Joi.string().pattern(objectIdPattern).required(),
  description: Joi.string().trim().optional().allow("").max(500),
});

const editSubCategoryValidationSchema = Joi.object({
  name: Joi.string().min(2).max(50).trim().optional(),
  category: Joi.string().pattern(objectIdPattern).optional(),
  description: Joi.string().trim().optional().allow("").max(500),
});

module.exports = {
  addSubCategoryValidationSchema,
  editSubCategoryValidationSchema,
};
