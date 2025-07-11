const { GraphQLError } = require('graphql');
const { 
  findAllUsers, 
  findUserById, 
  findAllPosts, 
  findPostById,
  findPostsByAuthorId,
  findPublishedPosts,
  searchUsers,
  searchPosts,
  getStats,
  validateDataIntegrity
} = require('../utils/dataManager');
const { validateGraphQLInput } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Query resolvers for GraphQL operations
 */
const queryResolvers = {
  /**
   * Get all users
   */
  users: async (parent, args, context) => {
    try {
      logger.info('Fetching all users');
      const users = await findAllUsers();
      logger.info('Users fetched successfully', { count: users.length });
      return users;
    } catch (error) {
      logger.logError('Error fetching users', error);
      throw new GraphQLError('Failed to fetch users', {
        extensions: {
          code: 'FETCH_USERS_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Get user by ID
   */
  user: async (parent, { id }, context) => {
    try {
      logger.info('Fetching user by ID', { userId: id });
      
      // Validate ID
      const idValidationErrors = validateGraphQLInput.validateId(id);
      if (idValidationErrors.length > 0) {
        throw new GraphQLError(idValidationErrors[0], {
          extensions: {
            code: 'INVALID_ID',
            field: 'id'
          }
        });
      }
      
      const user = await findUserById(id);
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: id
          }
        });
      }
      
      logger.info('User fetched successfully', { userId: id, name: user.name });
      return user;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error fetching user by ID', error, { userId: id });
      throw new GraphQLError('Failed to fetch user', {
        extensions: {
          code: 'FETCH_USER_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Search users
   */
  searchUsers: async (parent, { input }, context) => {
    try {
      logger.info('Searching users', { searchTerm: input.term });
      
      if (!input.term || input.term.trim().length === 0) {
        throw new GraphQLError('Search term is required', {
          extensions: {
            code: 'INVALID_SEARCH_TERM'
          }
        });
      }
      
      const users = await searchUsers(input.term.trim());
      
      // Apply pagination if provided
      let result = users;
      if (input.offset !== undefined || input.limit !== undefined) {
        const offset = input.offset || 0;
        const limit = input.limit || 10;
        result = users.slice(offset, offset + limit);
      }
      
      logger.info('User search completed', { 
        searchTerm: input.term, 
        totalResults: users.length,
        returnedResults: result.length 
      });
      
      return result;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error searching users', error, { input });
      throw new GraphQLError('Failed to search users', {
        extensions: {
          code: 'SEARCH_USERS_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Get all posts
   */
  posts: async (parent, args, context) => {
    try {
      logger.info('Fetching all posts');
      const posts = await findAllPosts();
      logger.info('Posts fetched successfully', { count: posts.length });
      return posts;
    } catch (error) {
      logger.logError('Error fetching posts', error);
      throw new GraphQLError('Failed to fetch posts', {
        extensions: {
          code: 'FETCH_POSTS_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Get post by ID
   */
  post: async (parent, { id }, context) => {
    try {
      logger.info('Fetching post by ID', { postId: id });
      
      // Validate ID
      const idValidationErrors = validateGraphQLInput.validateId(id);
      if (idValidationErrors.length > 0) {
        throw new GraphQLError(idValidationErrors[0], {
          extensions: {
            code: 'INVALID_ID',
            field: 'id'
          }
        });
      }
      
      const post = await findPostById(id);
      
      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: id
          }
        });
      }
      
      logger.info('Post fetched successfully', { postId: id, title: post.title });
      return post;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error fetching post by ID', error, { postId: id });
      throw new GraphQLError('Failed to fetch post', {
        extensions: {
          code: 'FETCH_POST_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Get published posts
   */
  publishedPosts: async (parent, args, context) => {
    try {
      logger.info('Fetching published posts');
      const posts = await findPublishedPosts();
      logger.info('Published posts fetched successfully', { count: posts.length });
      return posts;
    } catch (error) {
      logger.logError('Error fetching published posts', error);
      throw new GraphQLError('Failed to fetch published posts', {
        extensions: {
          code: 'FETCH_PUBLISHED_POSTS_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Get posts by author ID
   */
  postsByAuthor: async (parent, { authorId }, context) => {
    try {
      logger.info('Fetching posts by author', { authorId });
      
      // Validate ID
      const idValidationErrors = validateGraphQLInput.validateId(authorId);
      if (idValidationErrors.length > 0) {
        throw new GraphQLError(idValidationErrors[0], {
          extensions: {
            code: 'INVALID_ID',
            field: 'authorId'
          }
        });
      }
      
      // Check if author exists
      const author = await findUserById(authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: {
            code: 'AUTHOR_NOT_FOUND',
            authorId
          }
        });
      }
      
      const posts = await findPostsByAuthorId(authorId);
      logger.info('Posts by author fetched successfully', { 
        authorId, 
        authorName: author.name,
        count: posts.length 
      });
      
      return posts;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error fetching posts by author', error, { authorId });
      throw new GraphQLError('Failed to fetch posts by author', {
        extensions: {
          code: 'FETCH_POSTS_BY_AUTHOR_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Search posts
   */
  searchPosts: async (parent, { input }, context) => {
    try {
      logger.info('Searching posts', { searchTerm: input.term });
      
      if (!input.term || input.term.trim().length === 0) {
        throw new GraphQLError('Search term is required', {
          extensions: {
            code: 'INVALID_SEARCH_TERM'
          }
        });
      }
      
      const posts = await searchPosts(input.term.trim());
      
      // Apply pagination if provided
      let result = posts;
      if (input.offset !== undefined || input.limit !== undefined) {
        const offset = input.offset || 0;
        const limit = input.limit || 10;
        result = posts.slice(offset, offset + limit);
      }
      
      logger.info('Post search completed', { 
        searchTerm: input.term, 
        totalResults: posts.length,
        returnedResults: result.length 
      });
      
      return result;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error searching posts', error, { input });
      throw new GraphQLError('Failed to search posts', {
        extensions: {
          code: 'SEARCH_POSTS_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Get database statistics
   */
  stats: async (parent, args, context) => {
    try {
      logger.info('Fetching database statistics');
      const stats = await getStats();
      logger.info('Database statistics fetched successfully', stats);
      return stats;
    } catch (error) {
      logger.logError('Error fetching database statistics', error);
      throw new GraphQLError('Failed to fetch database statistics', {
        extensions: {
          code: 'FETCH_STATS_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Validate data integrity
   */
  validateIntegrity: async (parent, args, context) => {
    try {
      logger.info('Validating data integrity');
      const integrityReport = await validateDataIntegrity();
      logger.info('Data integrity validation completed', { 
        isValid: integrityReport.isValid,
        issueCount: integrityReport.issues.length 
      });
      return integrityReport;
    } catch (error) {
      logger.logError('Error validating data integrity', error);
      throw new GraphQLError('Failed to validate data integrity', {
        extensions: {
          code: 'VALIDATE_INTEGRITY_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Health check
   */
  health: async (parent, args, context) => {
    try {
      const timestamp = new Date().toISOString();
      const message = `GraphQL API is healthy at ${timestamp}`;
      logger.info('Health check performed');
      return message;
    } catch (error) {
      logger.logError('Error in health check', error);
      throw new GraphQLError('Health check failed', {
        extensions: {
          code: 'HEALTH_CHECK_ERROR',
          originalError: error.message
        }
      });
    }
  }
};

module.exports = queryResolvers;