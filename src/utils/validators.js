const path = require('path');
const fs = require('fs');

/**
 * Validate required environment variables
 */
const validateEnvironment = () => {
  const requiredEnvVars = [
    'NODE_ENV',
    'DATA_FILE_PATH'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Validate NODE_ENV values
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV value: ${process.env.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`);
  }
  
  // Validate DATA_FILE_PATH exists
  const dataFilePath = path.resolve(process.env.DATA_FILE_PATH);
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`Data file not found at: ${dataFilePath}`);
  }
  
  // Validate PORT if provided
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid PORT value: ${process.env.PORT}. Must be a number between 1 and 65535`);
    }
  }
  
  console.log('✅ Environment validation passed');
};

/**
 * Validate GraphQL input data
 */
const validateGraphQLInput = {
  /**
   * Validate user input
   */
  validateUserInput: (input) => {
    const errors = [];
    
    if (!input) {
      errors.push('User input is required');
      return errors;
    }
    
    // Validate name
    if (input.name !== undefined) {
      if (typeof input.name !== 'string' || input.name.trim().length === 0) {
        errors.push('Name must be a non-empty string');
      } else if (input.name.trim().length > 100) {
        errors.push('Name must be less than 100 characters');
      }
    }
    
    // Validate email
    if (input.email !== undefined) {
      if (typeof input.email !== 'string' || input.email.trim().length === 0) {
        errors.push('Email must be a non-empty string');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email.trim())) {
          errors.push('Email must be a valid email address');
        }
      }
    }
    
    return errors;
  },
  
  /**
   * Validate post input
   */
  validatePostInput: (input) => {
    const errors = [];
    
    if (!input) {
      errors.push('Post input is required');
      return errors;
    }
    
    // Validate title
    if (input.title !== undefined) {
      if (typeof input.title !== 'string' || input.title.trim().length === 0) {
        errors.push('Title must be a non-empty string');
      } else if (input.title.trim().length > 200) {
        errors.push('Title must be less than 200 characters');
      }
    }
    
    // Validate content
    if (input.content !== undefined) {
      if (typeof input.content !== 'string' || input.content.trim().length === 0) {
        errors.push('Content must be a non-empty string');
      } else if (input.content.trim().length > 5000) {
        errors.push('Content must be less than 5000 characters');
      }
    }
    
    // Validate authorId
    if (input.authorId !== undefined) {
      if (typeof input.authorId !== 'string' || input.authorId.trim().length === 0) {
        errors.push('Author ID must be a non-empty string');
      }
    }
    
    return errors;
  },
  
  /**
   * Validate ID parameter
   */
  validateId: (id) => {
    if (!id) {
      return ['ID is required'];
    }
    
    if (typeof id !== 'string' || id.trim().length === 0) {
      return ['ID must be a non-empty string'];
    }
    
    return [];
  }
};

/**
 * Sanitize user input to prevent XSS and other attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove HTML tags and suspicious characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim();
};

/**
 * Validate and sanitize user input
 */
const validateAndSanitizeUserInput = (input) => {
  // First validate the structure
  const validationErrors = validateGraphQLInput.validateUserInput(input);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  // Then sanitize the input
  const sanitized = { ...input };
  if (sanitized.name) {
    sanitized.name = sanitizeInput(sanitized.name);
  }
  if (sanitized.email) {
    sanitized.email = sanitizeInput(sanitized.email);
  }
  
  return sanitized;
};

/**
 * Validate and sanitize post input
 */
const validateAndSanitizePostInput = (input) => {
  // First validate the structure
  const validationErrors = validateGraphQLInput.validatePostInput(input);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  // Then sanitize the input
  const sanitized = { ...input };
  if (sanitized.title) {
    sanitized.title = sanitizeInput(sanitized.title);
  }
  if (sanitized.content) {
    sanitized.content = sanitizeInput(sanitized.content);
  }
  if (sanitized.authorId) {
    sanitized.authorId = sanitizeInput(sanitized.authorId);
  }
  
  return sanitized;
};

/**
 * Rate limiting validation
 */
const validateRateLimit = (req, maxRequests = 100, windowMs = 60000) => {
  // Simple in-memory rate limiting (for production, use Redis or similar)
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  // Initialize rate limit store if it doesn't exist
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  
  const clientRequests = global.rateLimitStore.get(clientId) || [];
  
  // Remove old requests outside the window
  const recentRequests = clientRequests.filter(timestamp => now - timestamp < windowMs);
  
  // Check if limit exceeded
  if (recentRequests.length >= maxRequests) {
    const resetTime = new Date(recentRequests[0] + windowMs);
    throw new Error(`Rate limit exceeded. Try again after ${resetTime.toISOString()}`);
  }
  
  // Add current request
  recentRequests.push(now);
  global.rateLimitStore.set(clientId, recentRequests);
  
  return {
    remaining: maxRequests - recentRequests.length,
    resetTime: new Date(now + windowMs)
  };
};

/**
 * Validate JSON structure
 */
const validateJSONStructure = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON structure: must be an object');
  }
  
  if (!Array.isArray(data.users)) {
    throw new Error('Invalid JSON structure: users must be an array');
  }
  
  if (!Array.isArray(data.posts)) {
    throw new Error('Invalid JSON structure: posts must be an array');
  }
  
  // Validate user objects
  data.users.forEach((user, index) => {
    if (!user.id || typeof user.id !== 'string') {
      throw new Error(`Invalid user at index ${index}: id must be a non-empty string`);
    }
    if (!user.name || typeof user.name !== 'string') {
      throw new Error(`Invalid user at index ${index}: name must be a non-empty string`);
    }
    if (!user.email || typeof user.email !== 'string') {
      throw new Error(`Invalid user at index ${index}: email must be a non-empty string`);
    }
  });
  
  // Validate post objects
  data.posts.forEach((post, index) => {
    if (!post.id || typeof post.id !== 'string') {
      throw new Error(`Invalid post at index ${index}: id must be a non-empty string`);
    }
    if (!post.title || typeof post.title !== 'string') {
      throw new Error(`Invalid post at index ${index}: title must be a non-empty string`);
    }
    if (!post.content || typeof post.content !== 'string') {
      throw new Error(`Invalid post at index ${index}: content must be a non-empty string`);
    }
    if (!post.authorId || typeof post.authorId !== 'string') {
      throw new Error(`Invalid post at index ${index}: authorId must be a non-empty string`);
    }
  });
  
  return true;
};

module.exports = {
  validateEnvironment,
  validateGraphQLInput,
  sanitizeInput,
  validateAndSanitizeUserInput,
  validateAndSanitizePostInput,
  validateRateLimit,
  validateJSONStructure
};