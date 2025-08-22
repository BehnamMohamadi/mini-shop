// utils/validations/user-validator.js
const Joi = require("joi");

const addUserValidationSchema = Joi.object({
  firstname: Joi.string().min(2).max(30).trim().required().messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name cannot exceed 30 characters",
    "any.required": "First name is required",
  }),
  lastname: Joi.string().min(2).max(30).trim().required().messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name cannot exceed 30 characters",
    "any.required": "Last name is required",
  }),
  username: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "org", "ir"] } })
    .trim()
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Username (email) is required",
    }),
  password: Joi.string()
    .min(8)
    .max(30)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password cannot exceed 30 characters",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      "any.required": "Password is required",
    }),
  role: Joi.string().valid("customer", "admin").default("customer").messages({
    "any.only": "Role must be either customer or admin",
  }),
  address: Joi.string().trim().optional().allow("").max(500).messages({
    "string.max": "Address cannot exceed 500 characters",
  }),
  phonenumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .trim()
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Please provide a valid Iranian phone number",
    }),
});

const editUserValidationSchema = Joi.object({
  firstname: Joi.string().min(2).max(30).trim().optional().messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name cannot exceed 30 characters",
  }),
  lastname: Joi.string().min(2).max(30).trim().optional().messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name cannot exceed 30 characters",
  }),
  username: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "org", "ir"] } })
    .trim()
    .optional()
    .messages({
      "string.email": "Please provide a valid email address",
    }),
  address: Joi.string().trim().optional().allow("").max(500).messages({
    "string.max": "Address cannot exceed 500 characters",
  }),
  phonenumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .trim()
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Please provide a valid Iranian phone number",
    }),
  role: Joi.string().valid("customer", "admin").optional().messages({
    "any.only": "Role must be either customer or admin",
  }),
});

module.exports = {
  addUserValidationSchema,
  editUserValidationSchema,
};
