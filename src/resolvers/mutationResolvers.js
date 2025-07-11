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

const mutationResolvers = {

  createUser: async (parent, { input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Creating new user', { input: { ...input, email: input.email ? '***' : undefined } });
      
      const validatedInput = validateAndSanitizeUserInput(input);
      
      if (!validatedInput.name || !validatedInput.email) {
        throw new GraphQLError('Name and email are required', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'input'
          }
        });
      }
      
      const data = await readData();
      
      const existingUser = findUserByEmail(data, validatedInput.email);
      if (existingUser) {
        throw new GraphQLError('User with this email already exists', {
          extensions: {
            code: 'USER_ALREADY_EXISTS',
            email: validatedInput.email
          }
        });
      }
      
      const newId = generateId(data.users);
      
      const newUser = {
        id: newId,
        name: validatedInput.name,
        email: validatedInput.email,
        posts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      data.users.push(newUser);
      
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
      
      const validatedInput = validateAndSanitizeUserInput(input);
      
      const data = await readData();
      
      const userIndex = data.users.findIndex(user => user.id === id);
      if (userIndex === -1) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: id
          }
        });
      }
      

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
      
      const updatedUser = {
        ...data.users[userIndex],
        ...validatedInput,
        updatedAt: new Date().toISOString()
      };
      
      data.users[userIndex] = updatedUser;
      
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

  createPost: async (parent, { input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Creating new post', { 
        authorId: input.authorId,
        title: input.title?.substring(0, 50) + '...' 
      });
      
      const validatedInput = validateAndSanitizePostInput(input);
      
      if (!validatedInput.title || !validatedInput.content || !validatedInput.authorId) {
        throw new GraphQLError('Title, content, and authorId are required', {
          extensions: {
            code: 'BAD_USER_INPUT',
            argumentName: 'input'
          }
        });
      }
      
      const data = await readData();
      

      const author = findUserById(data, validatedInput.authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: validatedInput.authorId
          }
        });
      }
      

      const newId = generateId(data.posts);
      
      const newPost = {
        id: newId,
        title: validatedInput.title,
        content: validatedInput.content,
        authorId: validatedInput.authorId,
        published: validatedInput.published || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      data.posts.push(newPost);
      
      const userIndex = data.users.findIndex(user => user.id === validatedInput.authorId);
      if (userIndex !== -1) {
        if (!data.users[userIndex].posts) {
          data.users[userIndex].posts = [];
        }
        data.users[userIndex].posts.push(newId);
      }
      
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

  updatePost: async (parent, { id, input }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Updating post', { 
        postId: id,
        title: input.title?.substring(0, 50) + '...' 
      });
      
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
      
      const validatedInput = validateAndSanitizePostInput(input);
      
      const data = await readData();
      
      const postIndex = data.posts.findIndex(post => post.id === id);
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: id
          }
        });
      }
      
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
      
      const updatedPost = {
        ...data.posts[postIndex],
        ...validatedInput,
        updatedAt: new Date().toISOString()
      };
      
      data.posts[postIndex] = updatedPost;
      
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


  deletePost: async (parent, { id }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Deleting post', { postId: id });
      

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
      

      const data = await readData();
      

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
      

      data.posts.splice(postIndex, 1);
      

      const authorIndex = data.users.findIndex(user => user.id === postToDelete.authorId);
      if (authorIndex !== -1 && data.users[authorIndex].posts) {
        data.users[authorIndex].posts = data.users[authorIndex].posts.filter(postId => postId !== id);
      }
      
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


  togglePostPublished: async (parent, { id }, context) => {
    const startTime = Date.now();
    
    try {
      logger.info('Toggling post published status', { postId: id });
      
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
      
      const data = await readData();
      
      const postIndex = data.posts.findIndex(post => post.id === id);
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: id
          }
        });
      }
      
      const updatedPost = {
        ...data.posts[postIndex],
        published: !data.posts[postIndex].published,
        updatedAt: new Date().toISOString()
      };
      
      data.posts[postIndex] = updatedPost;
      
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