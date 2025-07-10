const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * Validates required environment variables
 */
const validateEnvironment = () => {
  const requiredVars = [
    'NODE_ENV',
    'DATA_FILE_PATH'
  ];
  
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate data file path
  const dataFilePath = path.resolve(process.env.DATA_FILE_PATH);
  if (!fs.existsSync(dataFilePath)) {
    logger.error('Data file not found:', dataFilePath);
    throw new Error(`Data file not found: ${dataFilePath}`);
  }
  
  // Validate NODE_ENV
  const validEnvironments = ['development', 'test', 'production'];
  if (!validEnvironments.includes(process.env.NODE_ENV)) {
    logger.warn('NODE_ENV is not set to a valid environment. Using development.');
    process.env.NODE_ENV = 'development';
  }
  
  // Validate PORT if provided
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      logger.error('Invalid PORT value:', process.env.PORT);
      throw new Error(`Invalid PORT value: ${process.env.PORT}`);
    }
  }
  
  logger.info('Environment validation completed successfully');
};

/**
 * Validates GraphQL input data
 */
const validateGraphQLInput = (input, schema) => {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    // Skip validation if field is not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`Field '${field}' must be of type ${rules.type}`);
    }
    
    // String length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Field '${field}' must be at least ${rules.minLength} characters long`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Field '${field}' must not exceed ${rules.maxLength} characters`);
    }
    
    // Email validation
    if (rules.isEmail && !isValidEmail(value)) {
      errors.push(`Field '${field}' must be a valid email address`);
    }
    
    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }
  
  return errors;
};

/**
 * Email validation helper
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitizes user input to prevent XSS and other attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Validates ID format (simple UUID or numeric ID)
 */
const isValidId = (id) => {
  if (typeof id !== 'string') {
    return false;
  }
  
  // Check for UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return true;
  }
  
  // Check for numeric ID
  const numericRegex = /^\d+$/;
  if (numericRegex.test(id)) {
    return true;
  }
  
  return false;
};

/**
 * Common validation schemas
 */
const validationSchemas = {
  user: {
    name: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 50
    },
    email: {
      required: true,
      type: 'string',
      isEmail: true,
      maxLength: 100
    }
  },
  
  post: {
    title: {
      required: true,
      type: 'string',
      minLength: 5,
      maxLength: 200
    },
    content: {
      required: true,
      type: 'string',
      minLength: 10,
      maxLength: 5000
    },
    authorId: {
      required: true,
      type: 'string',
      validate: (value) => isValidId(value) ? null : 'Invalid author ID format'
    }
  }
};

module.exports = {
  validateEnvironment,
  validateGraphQLInput,
  sanitizeInput,
  isValidId,
  isValidEmail,
  validationSchemas
};