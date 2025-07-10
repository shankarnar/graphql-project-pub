const { GraphQLError } = require('graphql');
const dataManager = require('../utils/dataManager');
const { isValidId } = require('../utils/validation');
const logger = require('../utils/logger');

const queryResolvers = {
  // User queries
  users: async () => {
    try {
      logger.debug('Fetching all users');
      const users = await dataManager.getAllUsers();
      logger.debug(`Found ${users.length} users`);
      return users;
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw new GraphQLError('Failed to fetch users', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  user: async (parent, { id }) => {
    try {
      logger.debug(`Fetching user with ID: ${id}`);
      
      if (!isValidId(id)) {
        throw new GraphQLError('Invalid user ID format', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const user = await dataManager.getUserById(id);
      
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      logger.debug(`Found user: ${user.name}`);
      return user;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.error('Error fetching user:', error);
      throw new GraphQLError('Failed to fetch user', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  // Post queries
  posts: async () => {
    try {
      logger.debug('Fetching all posts');
      const posts = await dataManager.getAllPosts();
      logger.debug(`Found ${posts.length} posts`);
      return posts;
    } catch (error) {
      logger.error('Error fetching posts:', error);
      throw new GraphQLError('Failed to fetch posts', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  post: async (parent, { id }) => {
    try {
      logger.debug(`Fetching post with ID: ${id}`);
      
      if (!isValidId(id)) {
        throw new GraphQLError('Invalid post ID format', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const post = await dataManager.getPostById(id);
      
      if (!post) {
        throw new GraphQLError('Post not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      logger.debug(`Found post: ${post.title}`);
      return post;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.error('Error fetching post:', error);
      throw new GraphQLError('Failed to fetch post', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  postsByAuthor: async (parent, { authorId }) => {
    try {
      logger.debug(`Fetching posts by author: ${authorId}`);
      
      if (!isValidId(authorId)) {
        throw new GraphQLError('Invalid author ID format', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      // Verify author exists
      const author = await dataManager.getUserById(authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: { code: 'NOT_FOUND' }
        });
      }

      const posts = await dataManager.getPostsByAuthor(authorId);
      logger.debug(`Found ${posts.length} posts by author ${authorId}`);
      return posts;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.error('Error fetching posts by author:', error);
      throw new GraphQLError('Failed to fetch posts by author', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  // Search queries
  searchUsers: async (parent, { query }) => {
    try {
      logger.debug(`Searching users with query: ${query}`);
      
      if (!query || query.trim().length < 2) {
        throw new GraphQLError('Search query must be at least 2 characters long', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const users = await dataManager.searchUsers(query.trim());
      logger.debug(`Found ${users.length} users matching query: ${query}`);
      return users;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.error('Error searching users:', error);
      throw new GraphQLError('Failed to search users', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  searchPosts: async (parent, { query }) => {
    try {
      logger.debug(`Searching posts with query: ${query}`);
      
      if (!query || query.trim().length < 2) {
        throw new GraphQLError('Search query must be at least 2 characters long', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const posts = await dataManager.searchPosts(query.trim());
      logger.debug(`Found ${posts.length} posts matching query: ${query}`);
      return posts;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      logger.error('Error searching posts:', error);
      throw new GraphQLError('Failed to search posts', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  // Statistics
  userCount: async () => {
    try {
      logger.debug('Fetching user count');
      const count = await dataManager.getUserCount();
      logger.debug(`User count: ${count}`);
      return count;
    } catch (error) {
      logger.error('Error fetching user count:', error);
      throw new GraphQLError('Failed to fetch user count', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  },

  postCount: async () => {
    try {
      logger.debug('Fetching post count');
      const count = await dataManager.getPostCount();
      logger.debug(`Post count: ${count}`);
      return count;
    } catch (error) {
      logger.error('Error fetching post count:', error);
      throw new GraphQLError('Failed to fetch post count', {
        extensions: { code: 'INTERNAL_ERROR' }
      });
    }
  }
};

module.exports = queryResolvers;