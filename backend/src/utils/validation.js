const Joi = require('joi');

// Email validation schema
const emailSchema = Joi.string().email().required();

// Password validation schema
const passwordSchema = Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required();

// Product validation schema
const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000),
  price: Joi.number().positive().required(),
  category: Joi.string().valid('electronics', 'clothing', 'books', 'sports', 'home', 'automotive', 'health', 'beauty', 'food', 'other').required(),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).required()
});

// User registration schema
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: emailSchema,
  password: passwordSchema
});

// Login schema
const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required()
});

// Validation functions
const validateEmail = (email) => {
  return emailSchema.validate(email);
};

const validatePassword = (password) => {
  return passwordSchema.validate(password);
};

const validateProduct = (productData) => {
  return productSchema.validate(productData);
};

const validateRegistration = (userData) => {
  return registerSchema.validate(userData);
};

const validateLogin = (loginData) => {
  return loginSchema.validate(loginData);
};

module.exports = {
  validateEmail,
  validatePassword,
  validateProduct,
  validateRegistration,
  validateLogin
}; 