const queryResolvers = require('./queryResolvers');
const mutationResolvers = require('./mutationResolvers');
const fieldResolvers = require('./fieldResolvers');
const logger = require('../utils/logger');

// Error handling wrapper for resolvers
const withErrorHandling = (resolver) => {
  return async (parent, args, context, info) => {
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      logger.error('Resolver error:', error);
      throw error;
    }
  };
};

// Apply error handling to all resolvers
const wrapResolvers = (resolvers) => {
  const wrapped = {};
  
  for (const [key, resolver] of Object.entries(resolvers)) {
    if (typeof resolver === 'function') {
      wrapped[key] = withErrorHandling(resolver);
    } else if (typeof resolver === 'object') {
      wrapped[key] = wrapResolvers(resolver);
    } else {
      wrapped[key] = resolver;
    }
  }
  
  return wrapped;
};

// Combined resolvers
const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
  ...fieldResolvers
};

// Export wrapped resolvers
module.exports = wrapResolvers(resolvers);