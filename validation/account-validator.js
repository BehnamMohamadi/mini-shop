const Joi = require("joi");

const editAccountValidationSchema = Joi.object({
  firstname: Joi.string().min(3).max(30).trim().optional(),
  lastname: Joi.string().min(3).max(30).trim().optional(),
  username: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
    .trim()
    .optional(),
  address: Joi.string().trim().optional().allow(""),
  phonenumber: Joi.string()
    .pattern(/^(\+98|0)?9\d{9}$/)
    .trim()
    .optional()
    .allow(""),
});

module.exports = {
  editAccountValidationSchema,
};
