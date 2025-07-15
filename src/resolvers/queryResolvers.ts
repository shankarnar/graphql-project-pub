import { GraphQLError } from 'graphql';
import { 
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
} from '../utils/dataManager';
import { validateGraphQLInput } from '../utils/validators';
import type { 
  User, 
  Post, 
  SearchInput, 
  Stats, 
  IntegrityReport,
  GraphQLContext 
} from '../types';
import logger from '../utils/logger';

/**
 * Query resolvers for GraphQL operations
 */
const queryResolvers = {
  /**
   * Health check query
   */
  hello: (): string => {
    const timestamp = new Date().toISOString();
    const message = `GraphQL API is healthy at ${timestamp}`;
    logger.info('Health check performed');
    return message;
  },

  /**
   * Get all users
   */
  users: async (_parent: any, _args: any, _context: GraphQLContext): Promise<User[]> => {
    try {
      logger.info('Fetching all users');
      const users = await findAllUsers();
      logger.info('Users fetched successfully', { count: users.length });
      return users;
    } catch (error) {
      logger.logError('Error fetching users', error as Error);
      throw new GraphQLError('Failed to fetch users', {
        extensions: {
          code: 'FETCH_USERS_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Get user by ID
   */
  user: async (_parent: any, args: { id: string }, _context: GraphQLContext): Promise<User | null> => {
    try {
      logger.info('Fetching user by ID', { userId: args.id });
      
      // Validate ID
      const idValidationErrors = validateGraphQLInput.validateId(args.id);
      if (idValidationErrors.length > 0) {
        throw new GraphQLError(idValidationErrors[0]!, {
          extensions: {
            code: 'INVALID_ID',
            field: 'id'
          }
        });
      }
      
      const user = await findUserById(args.id);
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: args.id
          }
        });
      }
      
      logger.info('User fetched successfully', { userId: args.id, name: user.name });
      return user;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error fetching user by ID', error as Error, { userId: args.id });
      throw new GraphQLError('Failed to fetch user', {
        extensions: {
          code: 'FETCH_USER_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Search users
   */
  searchUsers: async (
    _parent: any, 
    args: { input: SearchInput }, 
    _context: GraphQLContext
  ): Promise<User[]> => {
    try {
      logger.info('Searching users', { searchTerm: args.input.term });
      
      if (!args.input.term || args.input.term.trim().length === 0) {
        throw new GraphQLError('Search term is required', {
          extensions: {
            code: 'INVALID_SEARCH_TERM'
          }
        });
      }
      
      const users = await searchUsers(args.input.term.trim());
      
      // Apply pagination if provided
      let result = users;
      if (args.input.offset !== undefined || args.input.limit !== undefined) {
        const offset = args.input.offset || 0;
        const limit = args.input.limit || 10;
        result = users.slice(offset, offset + limit);
      }
      
      logger.info('User search completed', { 
        searchTerm: args.input.term, 
        totalResults: users.length,
        returnedResults: result.length 
      });
      
      return result;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error searching users', error as Error, { input: args.input });
      throw new GraphQLError('Failed to search users', {
        extensions: {
          code: 'SEARCH_USERS_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Get all posts
   */
  posts: async (_parent: any, _args: any, _context: GraphQLContext): Promise<Post[]> => {
    try {
      logger.info('Fetching all posts');
      const posts = await findAllPosts();
      logger.info('Posts fetched successfully', { count: posts.length });
      return posts;
    } catch (error) {
      logger.logError('Error fetching posts', error as Error);
      throw new GraphQLError('Failed to fetch posts', {
        extensions: {
          code: 'FETCH_POSTS_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Get post by ID
   */
  post: async (_parent: any, args: { id: string }, _context: GraphQLContext): Promise<Post | null> => {
    try {
      logger.info('Fetching post by ID', { postId: args.id });
      
      // Validate ID
      const idValidationErrors = validateGraphQLInput.validateId(args.id);
      if (idValidationErrors.length > 0) {
        throw new GraphQLError(idValidationErrors[0]!, {
          extensions: {
            code: 'INVALID_ID',
            field: 'id'
          }
        });
      }
      
      const post = await findPostById(args.id);
      
      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: args.id
          }
        });
      }
      
      logger.info('Post fetched successfully', { postId: args.id, title: post.title });
      return post;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error fetching post by ID', error as Error, { postId: args.id });
      throw new GraphQLError('Failed to fetch post', {
        extensions: {
          code: 'FETCH_POST_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Get published posts
   */
  publishedPosts: async (_parent: any, _args: any, _context: GraphQLContext): Promise<Post[]> => {
    try {
      logger.info('Fetching published posts');
      const posts = await findPublishedPosts();
      logger.info('Published posts fetched successfully', { count: posts.length });
      return posts;
    } catch (error) {
      logger.logError('Error fetching published posts', error as Error);
      throw new GraphQLError('Failed to fetch published posts', {
        extensions: {
          code: 'FETCH_PUBLISHED_POSTS_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Get posts by author ID
   */
  postsByAuthor: async (
    _parent: any, 
    args: { authorId: string }, 
    _context: GraphQLContext
  ): Promise<Post[]> => {
    try {
      logger.info('Fetching posts by author', { authorId: args.authorId });
      
      // Validate ID
      const idValidationErrors = validateGraphQLInput.validateId(args.authorId);
      if (idValidationErrors.length > 0) {
        throw new GraphQLError(idValidationErrors[0]!, {
          extensions: {
            code: 'INVALID_ID',
            field: 'authorId'
          }
        });
      }
      
      // Check if author exists
      const author = await findUserById(args.authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: {
            code: 'AUTHOR_NOT_FOUND',
            authorId: args.authorId
          }
        });
      }
      
      const posts = await findPostsByAuthorId(args.authorId);
      logger.info('Posts by author fetched successfully', { 
        authorId: args.authorId, 
        authorName: author.name,
        count: posts.length 
      });
      
      return posts;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error fetching posts by author', error as Error, { authorId: args.authorId });
      throw new GraphQLError('Failed to fetch posts by author', {
        extensions: {
          code: 'FETCH_POSTS_BY_AUTHOR_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Search posts
   */
  searchPosts: async (
    _parent: any, 
    args: { input: SearchInput }, 
    _context: GraphQLContext
  ): Promise<Post[]> => {
    try {
      logger.info('Searching posts', { searchTerm: args.input.term });
      
      if (!args.input.term || args.input.term.trim().length === 0) {
        throw new GraphQLError('Search term is required', {
          extensions: {
            code: 'INVALID_SEARCH_TERM'
          }
        });
      }
      
      const posts = await searchPosts(args.input.term.trim());
      
      // Apply pagination if provided
      let result = posts;
      if (args.input.offset !== undefined || args.input.limit !== undefined) {
        const offset = args.input.offset || 0;
        const limit = args.input.limit || 10;
        result = posts.slice(offset, offset + limit);
      }
      
      logger.info('Post search completed', { 
        searchTerm: args.input.term, 
        totalResults: posts.length,
        returnedResults: result.length 
      });
      
      return result;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.logError('Error searching posts', error as Error, { input: args.input });
      throw new GraphQLError('Failed to search posts', {
        extensions: {
          code: 'SEARCH_POSTS_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Get database statistics
   */
  stats: async (_parent: any, _args: any, _context: GraphQLContext): Promise<Stats> => {
    try {
      logger.info('Fetching database statistics');
      const stats = await getStats();
      logger.info('Database statistics fetched successfully', stats);
      return stats;
    } catch (error) {
      logger.logError('Error fetching database statistics', error as Error);
      throw new GraphQLError('Failed to fetch database statistics', {
        extensions: {
          code: 'FETCH_STATS_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Validate data integrity
   */
  validateIntegrity: async (_parent: any, _args: any, _context: GraphQLContext): Promise<IntegrityReport> => {
    try {
      logger.info('Validating data integrity');
      const integrityReport = await validateDataIntegrity();
      logger.info('Data integrity validation completed', { 
        isValid: integrityReport.isValid,
        issueCount: integrityReport.issues.length 
      });
      return integrityReport;
    } catch (error) {
      logger.logError('Error validating data integrity', error as Error);
      throw new GraphQLError('Failed to validate data integrity', {
        extensions: {
          code: 'VALIDATE_INTEGRITY_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  }
};

export default queryResolvers;