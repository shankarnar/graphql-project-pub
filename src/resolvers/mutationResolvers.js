const { GraphQLError } = require('graphql');
const { 
  readData, 
  writeData, 
  generateId, 
  findUserById, 
  findPostById,
  findUserByEmail 
} = require('../utils/dataManager');
const { 
  validateAndSanitizeUserInput, 
  validateAndSanitizePostInput,
  validateGraphQLInput 
} = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * Mutation resolvers for GraphQL operations
 */
const mutationResolvers = {
  /**
   * Create a new user
   */
  createUser: async (parent, { input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Creating new user', { input: { ...input, email: input.email ? '***' : undefined } });
      
      // Validate and sanitize input
      const validatedInput = validateAndSanitizeUserInput(input);
      
      // Check if required fields are provided
      if (!validatedInput.name || !validatedInput.email) {
        throw new GraphQLError('Name and email are required', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'input'
          }
        });
      }
      
      // Read current data
      const data = await readData();
      
      // Check if user with email already exists
      const existingUser = findUserByEmail(data, validatedInput.email);
      if (existingUser) {
        throw new GraphQLError('User with this email already exists', {
          extensions: {
            code: 'USER_ALREADY_EXISTS',
            email: validatedInput.email
          }
        });
      }
      
      // Generate new user ID
      const newId = generateId(data.users);
      
      // Create new user object
      const newUser = {
        id: newId,
        name: validatedInput.name,
        email: validatedInput.email,
        posts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add user to data
      data.users.push(newUser);
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('User created successfully', { 
        userId: newId, 
        duration,
        userAgent: context.userAgent 
      });
      
      return newUser;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error creating user', { 
        error: error.message, 
        input,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to create user', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Update an existing user
   */
  updateUser: async (parent, { id, input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Updating user', { 
        userId: id, 
        input: { ...input, email: input.email ? '***' : undefined } 
      });
      
      // Validate ID
      const idErrors = validateGraphQLInput.validateId(id);
      if (idErrors.length > 0) {
        throw new GraphQLError('Invalid user ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'id',
            validationErrors: idErrors
          }
        });
      }
      
      // Validate and sanitize input
      const validatedInput = validateAndSanitizeUserInput(input);
      
      // Read current data
      const data = await readData();
      
      // Find user to update
      const userIndex = data.users.findIndex(user => user.id === id);
      if (userIndex === -1) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: id
          }
        });
      }
      
      // If email is being updated, check for duplicates
      if (validatedInput.email && validatedInput.email !== data.users[userIndex].email) {
        const existingUser = findUserByEmail(data, validatedInput.email);
        if (existingUser && existingUser.id !== id) {
          throw new GraphQLError('User with this email already exists', {
            extensions: {
              code: 'USER_ALREADY_EXISTS',
              email: validatedInput.email
            }
          });
        }
      }
      
      // Update user fields
      const updatedUser = {
        ...data.users[userIndex],
        ...validatedInput,
        updatedAt: new Date().toISOString()
      };
      
      data.users[userIndex] = updatedUser;
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('User updated successfully', { 
        userId: id, 
        duration,
        userAgent: context.userAgent 
      });
      
      return updatedUser;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error updating user', { 
        error: error.message, 
        userId: id,
        input,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to update user', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Delete a user
   */
  deleteUser: async (parent, { id }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Deleting user', { userId: id });
      
      // Validate ID
      const idErrors = validateGraphQLInput.validateId(id);
      if (idErrors.length > 0) {
        throw new GraphQLError('Invalid user ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'id',
            validationErrors: idErrors
          }
        });
      }
      
      // Read current data
      const data = await readData();
      
      // Find user to delete
      const userIndex = data.users.findIndex(user => user.id === id);
      if (userIndex === -1) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: id
          }
        });
      }
      
      const userToDelete = data.users[userIndex];
      
      // Remove user from users array
      data.users.splice(userIndex, 1);
      
      // Remove all posts by this user
      const postsToDelete = data.posts.filter(post => post.authorId === id);
      data.posts = data.posts.filter(post => post.authorId !== id);
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('User deleted successfully', { 
        userId: id, 
        postsDeleted: postsToDelete.length,
        duration,
        userAgent: context.userAgent 
      });
      
      return {
        ...userToDelete,
        deletedAt: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error deleting user', { 
        error: error.message, 
        userId: id,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to delete user', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Create a new post
   */
  createPost: async (parent, { input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Creating new post', { 
        authorId: input.authorId,
        title: input.title?.substring(0, 50) + '...' 
      });
      
      // Validate and sanitize input
      const validatedInput = validateAndSanitizePostInput(input);
      
      // Check if required fields are provided
      if (!validatedInput.title || !validatedInput.content || !validatedInput.authorId) {
        throw new GraphQLError('Title, content, and authorId are required', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'input'
          }
        });
      }
      
      // Read current data
      const data = await readData();
      
      // Check if author exists
      const author = findUserById(data, validatedInput.authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: validatedInput.authorId
          }
        });
      }
      
      // Generate new post ID
      const newId = generateId(data.posts);
      
      // Create new post object
      const newPost = {
        id: newId,
        title: validatedInput.title,
        content: validatedInput.content,
        authorId: validatedInput.authorId,
        published: validatedInput.published || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add post to data
      data.posts.push(newPost);
      
      // Add post ID to user's posts array
      const userIndex = data.users.findIndex(user => user.id === validatedInput.authorId);
      if (userIndex !== -1) {
        if (!data.users[userIndex].posts) {
          data.users[userIndex].posts = [];
        }
        data.users[userIndex].posts.push(newId);
      }
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('Post created successfully', { 
        postId: newId,
        authorId: validatedInput.authorId,
        duration,
        userAgent: context.userAgent 
      });
      
      return newPost;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error creating post', { 
        error: error.message, 
        input,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to create post', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Update an existing post
   */
  updatePost: async (parent, { id, input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Updating post', { 
        postId: id,
        title: input.title?.substring(0, 50) + '...' 
      });
      
      // Validate ID
      const idErrors = validateGraphQLInput.validateId(id);
      if (idErrors.length > 0) {
        throw new GraphQLError('Invalid post ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'id',
            validationErrors: idErrors
          }
        });
      }
      
      // Validate and sanitize input
      const validatedInput = validateAndSanitizePostInput(input);
      
      // Read current data
      const data = await readData();
      
      // Find post to update
      const postIndex = data.posts.findIndex(post => post.id === id);
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: id
          }
        });
      }
      
      // If authorId is being updated, check if new author exists
      if (validatedInput.authorId && validatedInput.authorId !== data.posts[postIndex].authorId) {
        const newAuthor = findUserById(data, validatedInput.authorId);
        if (!newAuthor) {
          throw new GraphQLError('New author not found', {
            extensions: {
              code: 'USER_NOT_FOUND',
              userId: validatedInput.authorId
            }
          });
        }
        
        // Remove post from old author's posts array
        const oldAuthorIndex = data.users.findIndex(user => user.id === data.posts[postIndex].authorId);
        if (oldAuthorIndex !== -1 && data.users[oldAuthorIndex].posts) {
          data.users[oldAuthorIndex].posts = data.users[oldAuthorIndex].posts.filter(postId => postId !== id);
        }
        
        // Add post to new author's posts array
        const newAuthorIndex = data.users.findIndex(user => user.id === validatedInput.authorId);
        if (newAuthorIndex !== -1) {
          if (!data.users[newAuthorIndex].posts) {
            data.users[newAuthorIndex].posts = [];
          }
          if (!data.users[newAuthorIndex].posts.includes(id)) {
            data.users[newAuthorIndex].posts.push(id);
          }
        }
      }
      
      // Update post fields
      const updatedPost = {
        ...data.posts[postIndex],
        ...validatedInput,
        updatedAt: new Date().toISOString()
      };
      
      data.posts[postIndex] = updatedPost;
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('Post updated successfully', { 
        postId: id,
        duration,
        userAgent: context.userAgent 
      });
      
      return updatedPost;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error updating post', { 
        error: error.message, 
        postId: id,
        input,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to update post', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Delete a post
   */
  deletePost: async (parent, { id }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Deleting post', { postId: id });
      
      // Validate ID
      const idErrors = validateGraphQLInput.validateId(id);
      if (idErrors.length > 0) {
        throw new GraphQLError('Invalid post ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'id',
            validationErrors: idErrors
          }
        });
      }
      
      // Read current data
      const data = await readData();
      
      // Find post to delete
      const postIndex = data.posts.findIndex(post => post.id === id);
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: id
          }
        });
      }
      
      const postToDelete = data.posts[postIndex];
      
      // Remove post from posts array
      data.posts.splice(postIndex, 1);
      
      // Remove post ID from author's posts array
      const authorIndex = data.users.findIndex(user => user.id === postToDelete.authorId);
      if (authorIndex !== -1 && data.users[authorIndex].posts) {
        data.users[authorIndex].posts = data.users[authorIndex].posts.filter(postId => postId !== id);
      }
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('Post deleted successfully', { 
        postId: id,
        authorId: postToDelete.authorId,
        duration,
        userAgent: context.userAgent 
      });
      
      return {
        ...postToDelete,
        deletedAt: new Date().toISOString()
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error deleting post', { 
        error: error.message, 
        postId: id,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to delete post', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  },

  /**
   * Publish/Unpublish a post
   */
  togglePostPublished: async (parent, { id }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Toggling post published status', { postId: id });
      
      // Validate ID
      const idErrors = validateGraphQLInput.validateId(id);
      if (idErrors.length > 0) {
        throw new GraphQLError('Invalid post ID', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'id',
            validationErrors: idErrors
          }
        });
      }
      
      // Read current data
      const data = await readData();
      
      // Find post to update
      const postIndex = data.posts.findIndex(post => post.id === id);
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: id
          }
        });
      }
      
      // Toggle published status
      const updatedPost = {
        ...data.posts[postIndex],
        published: !data.posts[postIndex].published,
        updatedAt: new Date().toISOString()
      };
      
      data.posts[postIndex] = updatedPost;
      
      // Write data back to file
      await writeData(data);
      
      const duration = Date.now() - startTime;
      logger.info('Post published status toggled successfully', { 
        postId: id,
        published: updatedPost.published,
        duration,
        userAgent: context.userAgent 
      });
      
      return updatedPost;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error toggling post published status', { 
        error: error.message, 
        postId: id,
        duration,
        userAgent: context.userAgent 
      });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to toggle post published status', {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error.message
        }
      });
    }
  }
};

module.exports = mutationResolvers;