import * as path from 'path';
import * as fs from 'fs';
import type { 
  DataStore, 
  CreateUserInput, 
  UpdateUserInput, 
  CreatePostInput, 
  UpdatePostInput,
  EnvironmentConfig,
  ValidationResult,
  ValidatorFunctions
} from '../types';


export const validateEnvironment = (): void => {

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.log('⚠️  NODE_ENV not set, defaulting to "development"');
  }
  
  if (!process.env.DATA_FILE_PATH) {
    process.env.DATA_FILE_PATH = './src/data/data.json';
    console.log('⚠️  DATA_FILE_PATH not set, defaulting to "./src/data/data.json"');
  }
  
  const validEnvs: readonly string[] = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    console.warn(`⚠️  Invalid NODE_ENV value: ${process.env.NODE_ENV}. Setting to "development"`);
    process.env.NODE_ENV = 'development';
  }
  

  const dataFilePath = path.resolve(process.env.DATA_FILE_PATH);
  const dataDir = path.dirname(dataFilePath);
  
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${dataDir}`);
    } catch (error) {
      console.warn(`⚠️  Could not create data directory: ${dataDir}`);
    }
  }
  
  if (!fs.existsSync(dataFilePath)) {
    try {

      const defaultData = {
        users: [],
        posts: []
      };
      fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2));
      console.log(`📄 Created default data file: ${dataFilePath}`);
    } catch (error) {
      console.warn(`⚠️  Could not create data file: ${dataFilePath}`);
    }
  }
  
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.warn(`⚠️  Invalid PORT value: ${process.env.PORT}. Will use default.`);
      delete process.env.PORT; 
    }
  }
  
  console.log('✅ Environment validation completed');
};


export const validateGraphQLInput: ValidatorFunctions = {

  validateUserInput: (input: any): string[] => {
    const errors: string[] = [];
    
    if (!input) {
      errors.push('User input is required');
      return errors;
    }
    
    if (input.name !== undefined) {
      if (typeof input.name !== 'string' || input.name.trim().length === 0) {
        errors.push('Name must be a non-empty string');
      } else if (input.name.trim().length > 100) {
        errors.push('Name must be less than 100 characters');
      }
    }
    
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
  

  validatePostInput: (input: any): string[] => {
    const errors: string[] = [];
    
    if (!input) {
      errors.push('Post input is required');
      return errors;
    }
    
    if (input.title !== undefined) {
      if (typeof input.title !== 'string' || input.title.trim().length === 0) {
        errors.push('Title must be a non-empty string');
      } else if (input.title.trim().length > 200) {
        errors.push('Title must be less than 200 characters');
      }
    }
    
    if (input.content !== undefined) {
      if (typeof input.content !== 'string' || input.content.trim().length === 0) {
        errors.push('Content must be a non-empty string');
      } else if (input.content.trim().length > 5000) {
        errors.push('Content must be less than 5000 characters');
      }
    }
    
    if (input.authorId !== undefined) {
      if (typeof input.authorId !== 'string' || input.authorId.trim().length === 0) {
        errors.push('Author ID must be a non-empty string');
      }
    }
    
    return errors;
  },
  
  validateId: (id: any): string[] => {
    if (!id) {
      return ['ID is required'];
    }
    
    if (typeof id !== 'string' || id.trim().length === 0) {
      return ['ID must be a non-empty string'];
    }
    
    return [];
  }
};

export const sanitizeInput = (input: unknown): string => {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Remove HTML tags and suspicious characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"']/g, '') // Remove potentially dangerous characters
    .trim();
};

export const validateAndSanitizeUserInput = (input: CreateUserInput | UpdateUserInput): CreateUserInput | UpdateUserInput => {

  const validationErrors = validateGraphQLInput.validateUserInput(input);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  const sanitized = { ...input };
  if ('name' in sanitized && sanitized.name) {
    sanitized.name = sanitizeInput(sanitized.name);
  }
  if ('email' in sanitized && sanitized.email) {
    sanitized.email = sanitizeInput(sanitized.email);
  }
  
  return sanitized;
};

export const validateAndSanitizePostInput = (input: CreatePostInput | UpdatePostInput): CreatePostInput | UpdatePostInput => {

  const validationErrors = validateGraphQLInput.validatePostInput(input);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  const sanitized = { ...input };
  if ('title' in sanitized && sanitized.title) {
    sanitized.title = sanitizeInput(sanitized.title);
  }
  if ('content' in sanitized && sanitized.content) {
    sanitized.content = sanitizeInput(sanitized.content);
  }
  if ('authorId' in sanitized && sanitized.authorId) {
    sanitized.authorId = sanitizeInput(sanitized.authorId);
  }
  
  return sanitized;
};


interface RateLimitResult {
  remaining: number;
  resetTime: Date;
}

interface RateLimitRequest {
  ip?: string;
}

declare global {
  var rateLimitStore: Map<string, number[]> | undefined;
}

export const validateRateLimit = (
  req: RateLimitRequest, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): RateLimitResult => {

  const clientId = req.ip || 'unknown';
  const now = Date.now();
  

  if (!globalThis.rateLimitStore) {
    globalThis.rateLimitStore = new Map<string, number[]>();
  }
  
  const store = globalThis.rateLimitStore;
  const clientRequests = store.get(clientId) || [];
  
  const recentRequests = clientRequests.filter(timestamp => now - timestamp < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    const resetTime = new Date(recentRequests[0]! + windowMs);
    throw new Error(`Rate limit exceeded. Try again after ${resetTime.toISOString()}`);
  }
  
  recentRequests.push(now);
  store.set(clientId, recentRequests);
  
  return {
    remaining: maxRequests - recentRequests.length,
    resetTime: new Date(now + windowMs)
  };
};

function validateJSONStructure(data: any): DataStore {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON structure: must be an object');
  }
  
  if (!Array.isArray(data.users)) {
    throw new Error('Invalid JSON structure: users must be an array');
  }
  
  if (!Array.isArray(data.posts)) {
    throw new Error('Invalid JSON structure: posts must be an array');
  }
  
  data.users.forEach((user: any, index: number) => {
    if (!user.id || typeof user.id !== 'string') {
      throw new Error(`Invalid user at index ${index}: id must be a non-empty string`);
    }
    if (!user.name || typeof user.name !== 'string') {
      throw new Error(`Invalid user at index ${index}: name must be a non-empty string`);
    }
    if (!user.email || typeof user.email !== 'string') {
      throw new Error(`Invalid user at index ${index}: email must be a non-empty string`);
    }
    if (!Array.isArray(user.posts)) {
      throw new Error(`Invalid user at index ${index}: posts must be an array`);
    }
  });
  
  data.posts.forEach((post: any, index: number) => {
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
    if (typeof post.published !== 'boolean') {
      throw new Error(`Invalid post at index ${index}: published must be a boolean`);
    }
  });
  
  return data as DataStore;
}

export { validateJSONStructure };

export const validateWithDetails = <T>(
  data: T, 
  validator: (data: T) => string[]
): ValidationResult => {
  const errors = validator(data);
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isCreateUserInput = (input: any): input is CreateUserInput => {
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof input.name === 'string' &&
    typeof input.email === 'string'
  );
};

export const isCreatePostInput = (input: any): input is CreatePostInput => {
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof input.title === 'string' &&
    typeof input.content === 'string' &&
    typeof input.authorId === 'string'
  );
};