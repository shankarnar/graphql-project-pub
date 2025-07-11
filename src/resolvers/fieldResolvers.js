const { GraphQLError } = require('graphql');
const { findUserById, findPostsByAuthorId } = require('../utils/dataManager');
const logger = require('../utils/logger');

/**
 * Field resolvers for complex field resolution in GraphQL
 */
const fieldResolvers = {
  /**
   * User field resolvers
   */
  User: {
    /**
     * Resolve posts for a user
     */
    posts: async (parent, args, context) => {
      try {
        logger.debug('Resolving posts for user', { userId: parent.id, userName: parent.name });
        
        // If posts are already populated (e.g., from eager loading), return them
        if (parent.posts && Array.isArray(parent.posts) && parent.posts.length > 0) {
          // Check if the first element is already a post object or just an ID
          if (typeof parent.posts[0] === 'object' && parent.posts[0].title) {
            logger.debug('Posts already populated for user', { userId: parent.id, count: parent.posts.length });
            return parent.posts;
          }
        }
        
        // Fetch posts by author ID
        const posts = await findPostsByAuthorId(parent.id);
        
        logger.debug('Posts resolved for user', { 
          userId: parent.id, 
          userName: parent.name,
          postCount: posts.length 
        });
        
        return posts;
      } catch (error) {
        logger.logError('Error resolving posts for user', error, { 
          userId: parent.id, 
          userName: parent.name 
        });
        
        throw new GraphQLError('Failed to resolve user posts', {
          extensions: {
            code: 'RESOLVE_USER_POSTS_ERROR',
            userId: parent.id,
            originalError: error.message
          }
        });
      }
    }
  },

  /**
   * Post field resolvers
   */
  Post: {
    /**
     * Resolve author for a post
     */
    author: async (parent, args, context) => {
      try {
        logger.debug('Resolving author for post', { postId: parent.id, postTitle: parent.title, authorId: parent.authorId });
        
        // If author is already populated, return it
        if (parent.author && typeof parent.author === 'object' && parent.author.name) {
          logger.debug('Author already populated for post', { 
            postId: parent.id, 
            authorId: parent.author.id,
            authorName: parent.author.name 
          });
          return parent.author;
        }
        
        // Fetch author by ID
        const author = await findUserById(parent.authorId);
        
        if (!author) {
          logger.warn('Author not found for post', { 
            postId: parent.id, 
            postTitle: parent.title,
            authorId: parent.authorId 
          });
          
          throw new GraphQLError('Author not found for post', {
            extensions: {
              code: 'AUTHOR_NOT_FOUND',
              postId: parent.id,
              authorId: parent.authorId
            }
          });
        }
        
        logger.debug('Author resolved for post', { 
          postId: parent.id, 
          postTitle: parent.title,
          authorId: author.id,
          authorName: author.name 
        });
        
        return author;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        
        logger.logError('Error resolving author for post', error, { 
          postId: parent.id, 
          postTitle: parent.title,
          authorId: parent.authorId 
        });
        
        throw new GraphQLError('Failed to resolve post author', {
          extensions: {
            code: 'RESOLVE_POST_AUTHOR_ERROR',
            postId: parent.id,
            authorId: parent.authorId,
            originalError: error.message
          }
        });
      }
    }
  },

  /**
   * DateTime scalar resolver
   */
  DateTime: {
    /**
     * Serialize DateTime to ISO string
     */
    serialize: (value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        return new Date(value).toISOString();
      }
      throw new GraphQLError('Value must be a Date object or ISO string');
    },

    /**
     * Parse value from input
     */
    parseValue: (value) => {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date format');
        }
        return date;
      }
      throw new GraphQLError('Value must be a string');
    },

    /**
     * Parse literal from AST
     */
    parseLiteral: (ast) => {
      if (ast.kind === 'StringValue') {
        const date = new Date(ast.value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date format');
        }
        return date;
      }
      throw new GraphQLError('Value must be a string');
    }
  }
};

module.exports = fieldResolvers;