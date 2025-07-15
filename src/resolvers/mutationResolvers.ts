import { GraphQLError } from 'graphql';
import { 
  readData, 
  writeData, 
  generateId, 
  findUserById, 
  findPostById,
  cleanupOrphanedData
} from '../utils/dataManager';
import { 
  validateAndSanitizeUserInput, 
  validateAndSanitizePostInput,
  validateGraphQLInput 
} from '../utils/validators';
import type { 
  User, 
  Post, 
  CreateUserInput, 
  UpdateUserInput, 
  CreatePostInput, 
  UpdatePostInput,
  DeleteResponse,
  CleanupResult,
  GraphQLContext 
} from '../types';
import logger from '../utils/logger';

/**
 * Mutation resolvers for GraphQL operations
 */
const mutationResolvers = {
  /**
   * Create a new user
   */
  createUser: async (
    _parent: any, 
    args: { input: CreateUserInput }, 
    _context: GraphQLContext
  ): Promise<User> => {
    try {
      logger.info('Creating new user', { 
        input: { ...args.input, email: args.input.email ? '***' : undefined } 
      });
      
      // Validate and sanitize input
      const sanitizedInput = validateAndSanitizeUserInput(args.input) as CreateUserInput;
      
      // Read current data
      const data = await readData();
      
      // Check if email already exists
      const existingUser = data.users.find(user => 
        user.email.toLowerCase() === sanitizedInput.email.toLowerCase()
      );
      
      if (existingUser) {
        throw new GraphQLError('A user with this email already exists', {
          extensions: {
            code: 'DUPLICATE_EMAIL',
            field: 'email'
          }
        });
      }
      
      // Generate new user ID
      const newId = generateId();
      
      // Create new user object
      const newUser: User = {
        id: newId,
        name: sanitizedInput.name,
        email: sanitizedInput.email.toLowerCase(),
        posts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add user to data
      data.users.push(newUser);
      
      // Write updated data
      await writeData(data);
      
      logger.info('User created successfully', { userId: newId, name: newUser.name });
      
      return newUser;
      
    } catch (error) {
      logger.logError('Error creating user', error as Error, { input: args.input });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to create user', {
        extensions: {
          code: 'CREATE_USER_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Update an existing user
   */
  updateUser: async (
    _parent: any, 
    args: { id: string; input: UpdateUserInput }, 
    _context: GraphQLContext
  ): Promise<User> => {
    try {
      logger.info('Updating user', { 
        userId: args.id, 
        input: { ...args.input, email: args.input.email ? '***' : undefined } 
      });
      
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
      
      // Validate and sanitize input
      const sanitizedInput = validateAndSanitizeUserInput(args.input) as UpdateUserInput;
      
      // Read current data
      const data = await readData();
      
      // Find user by ID
      const userIndex = data.users.findIndex(user => user.id === args.id);
      
      if (userIndex === -1) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: args.id
          }
        });
      }
      
      const existingUser = data.users[userIndex]!;
      
      // Check if email is being updated and if it already exists
      if (sanitizedInput.email && sanitizedInput.email.toLowerCase() !== existingUser.email.toLowerCase()) {
        const emailExists = data.users.some(user => 
          user.id !== args.id && user.email.toLowerCase() === sanitizedInput.email!.toLowerCase()
        );
        
        if (emailExists) {
          throw new GraphQLError('A user with this email already exists', {
            extensions: {
              code: 'DUPLICATE_EMAIL',
              field: 'email'
            }
          });
        }
      }
      
      // Update user fields with proper null handling
      const updatedUser: User = {
        ...existingUser,
        name: sanitizedInput.name ?? existingUser.name,
        email: sanitizedInput.email ? sanitizedInput.email.toLowerCase() : existingUser.email,
        updatedAt: new Date().toISOString()
      };
      
      // Update user in data
      data.users[userIndex] = updatedUser;
      
      // Write updated data
      await writeData(data);
      
      logger.info('User updated successfully', { userId: args.id, name: updatedUser.name });
      
      return updatedUser;
      
    } catch (error) {
      logger.logError('Error updating user', error as Error, { userId: args.id, input: args.input });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to update user', {
        extensions: {
          code: 'UPDATE_USER_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Delete a user
   */
  deleteUser: async (
    _parent: any, 
    args: { id: string }, 
    _context: GraphQLContext
  ): Promise<DeleteResponse> => {
    try {
      logger.info('Deleting user', { userId: args.id });
      
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
      
      // Read current data
      const data = await readData();
      
      // Find user by ID
      const userIndex = data.users.findIndex(user => user.id === args.id);
      
      if (userIndex === -1) {
        throw new GraphQLError('User not found', {
          extensions: {
            code: 'USER_NOT_FOUND',
            userId: args.id
          }
        });
      }
      
      const userToDelete = data.users[userIndex]!;
      
      // Remove user from data
      data.users.splice(userIndex, 1);
      
      // Remove all posts by this user
      const userPosts = data.posts.filter(post => post.authorId === args.id);
      data.posts = data.posts.filter(post => post.authorId !== args.id);
      
      // Write updated data
      await writeData(data);
      
      logger.info('User deleted successfully', { 
        userId: args.id, 
        name: userToDelete.name,
        deletedPosts: userPosts.length 
      });
      
      return {
        id: userToDelete.id,
        message: `User '${userToDelete.name}' and ${userPosts.length} associated posts deleted successfully`
      };
      
    } catch (error) {
      logger.logError('Error deleting user', error as Error, { userId: args.id });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to delete user', {
        extensions: {
          code: 'DELETE_USER_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Create a new post
   */
  createPost: async (
    _parent: any, 
    args: { input: CreatePostInput }, 
    _context: GraphQLContext
  ): Promise<Post> => {
    try {
      logger.info('Creating new post', { 
        input: { 
          ...args.input, 
          content: args.input.content ? `${args.input.content.substring(0, 50)}...` : undefined 
        } 
      });
      
      // Validate and sanitize input
      const sanitizedInput = validateAndSanitizePostInput(args.input) as CreatePostInput;
      
      // Read current data
      const data = await readData();
      
      // Verify author exists
      const author = data.users.find(user => user.id === sanitizedInput.authorId);
      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: {
            code: 'AUTHOR_NOT_FOUND',
            authorId: sanitizedInput.authorId
          }
        });
      }
      
      // Generate new post ID
      const newId = generateId();
      
      // Create new post object
      const newPost: Post = {
        id: newId,
        title: sanitizedInput.title,
        content: sanitizedInput.content,
        authorId: sanitizedInput.authorId,
        published: sanitizedInput.published ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Add post to data
      data.posts.push(newPost);
      
      // Add post ID to author's posts array
      const authorIndex = data.users.findIndex(user => user.id === sanitizedInput.authorId);
      if (authorIndex !== -1) {
        data.users[authorIndex]!.posts.push(newId);
        data.users[authorIndex]!.updatedAt = new Date().toISOString();
      }
      
      // Write updated data
      await writeData(data);
      
      logger.info('Post created successfully', { 
        postId: newId, 
        title: newPost.title, 
        authorId: sanitizedInput.authorId 
      });
      
      return newPost;
      
    } catch (error) {
      logger.logError('Error creating post', error as Error, { input: args.input });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to create post', {
        extensions: {
          code: 'CREATE_POST_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Update an existing post
   */
  updatePost: async (
    _parent: any, 
    args: { id: string; input: UpdatePostInput }, 
    _context: GraphQLContext
  ): Promise<Post> => {
    try {
      logger.info('Updating post', { 
        postId: args.id, 
        input: { 
          ...args.input, 
          content: args.input.content ? `${args.input.content.substring(0, 50)}...` : undefined 
        } 
      });
      
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
      
      // Validate and sanitize input
      const sanitizedInput = validateAndSanitizePostInput(args.input) as UpdatePostInput;
      
      // Read current data
      const data = await readData();
      
      // Find post by ID
      const postIndex = data.posts.findIndex(post => post.id === args.id);
      
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: args.id
          }
        });
      }
      
      const existingPost = data.posts[postIndex]!;
      
      // If authorId is being changed, verify new author exists
      if (sanitizedInput.authorId && sanitizedInput.authorId !== existingPost.authorId) {
        const newAuthor = data.users.find(user => user.id === sanitizedInput.authorId);
        if (!newAuthor) {
          throw new GraphQLError('New author not found', {
            extensions: {
              code: 'AUTHOR_NOT_FOUND',
              authorId: sanitizedInput.authorId
            }
          });
        }
        
        // Remove post from old author's posts array
        const oldAuthorIndex = data.users.findIndex(user => user.id === existingPost.authorId);
        if (oldAuthorIndex !== -1) {
          data.users[oldAuthorIndex]!.posts = data.users[oldAuthorIndex]!.posts.filter(postId => postId !== args.id);
          data.users[oldAuthorIndex]!.updatedAt = new Date().toISOString();
        }
        
        // Add post to new author's posts array
        const newAuthorIndex = data.users.findIndex(user => user.id === sanitizedInput.authorId);
        if (newAuthorIndex !== -1) {
          data.users[newAuthorIndex]!.posts.push(args.id);
          data.users[newAuthorIndex]!.updatedAt = new Date().toISOString();
        }
      }
      
      // Update post fields with proper null handling
      const updatedPost: Post = {
        ...existingPost,
        title: sanitizedInput.title ?? existingPost.title,
        content: sanitizedInput.content ?? existingPost.content,
        published: sanitizedInput.published ?? existingPost.published,
        authorId: sanitizedInput.authorId ?? existingPost.authorId,
        updatedAt: new Date().toISOString()
      };
      
      // Update post in data
      data.posts[postIndex] = updatedPost;
      
      // Write updated data
      await writeData(data);
      
      logger.info('Post updated successfully', { postId: args.id, title: updatedPost.title });
      
      return updatedPost;
      
    } catch (error) {
      logger.logError('Error updating post', error as Error, { postId: args.id, input: args.input });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to update post', {
        extensions: {
          code: 'UPDATE_POST_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Delete a post
   */
  deletePost: async (
    _parent: any, 
    args: { id: string }, 
    _context: GraphQLContext
  ): Promise<DeleteResponse> => {
    try {
      logger.info('Deleting post', { postId: args.id });
      
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
      
      // Read current data
      const data = await readData();
      
      // Find post by ID
      const postIndex = data.posts.findIndex(post => post.id === args.id);
      
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: args.id
          }
        });
      }
      
      const postToDelete = data.posts[postIndex]!;
      
      // Remove post from data
      data.posts.splice(postIndex, 1);
      
      // Remove post ID from author's posts array
      const authorIndex = data.users.findIndex(user => user.id === postToDelete.authorId);
      if (authorIndex !== -1) {
        data.users[authorIndex]!.posts = data.users[authorIndex]!.posts.filter(postId => postId !== args.id);
        data.users[authorIndex]!.updatedAt = new Date().toISOString();
      }
      
      // Write updated data
      await writeData(data);
      
      logger.info('Post deleted successfully', { 
        postId: args.id, 
        title: postToDelete.title,
        authorId: postToDelete.authorId 
      });
      
      return {
        id: postToDelete.id,
        message: `Post '${postToDelete.title}' deleted successfully`
      };
      
    } catch (error) {
      logger.logError('Error deleting post', error as Error, { postId: args.id });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to delete post', {
        extensions: {
          code: 'DELETE_POST_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Publish/Unpublish a post
   */
  togglePostPublished: async (
    _parent: any, 
    args: { id: string }, 
    _context: GraphQLContext
  ): Promise<Post> => {
    try {
      logger.info('Toggling post published status', { postId: args.id });
      
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
      
      // Read current data
      const data = await readData();
      
      // Find post by ID
      const postIndex = data.posts.findIndex(post => post.id === args.id);
      
      if (postIndex === -1) {
        throw new GraphQLError('Post not found', {
          extensions: {
            code: 'POST_NOT_FOUND',
            postId: args.id
          }
        });
      }
      
      // Toggle published status
      const updatedPost: Post = {
        ...data.posts[postIndex]!,
        published: !data.posts[postIndex]!.published,
        updatedAt: new Date().toISOString()
      };
      
      // Update post in data
      data.posts[postIndex] = updatedPost;
      
      // Write updated data
      await writeData(data);
      
      logger.info('Post published status toggled successfully', { 
        postId: args.id, 
        title: updatedPost.title,
        published: updatedPost.published 
      });
      
      return updatedPost;
      
    } catch (error) {
      logger.logError('Error toggling post published status', error as Error, { postId: args.id });
      
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      throw new GraphQLError('Failed to toggle post published status', {
        extensions: {
          code: 'TOGGLE_POST_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  },

  /**
   * Clean up orphaned data
   */
  cleanupOrphanedData: async (
    _parent: any, 
    _args: any, 
    _context: GraphQLContext
  ): Promise<CleanupResult> => {
    try {
      logger.info('Starting data cleanup operation');
      
      const result = await cleanupOrphanedData();
      
      logger.info('Data cleanup completed successfully', { 
        itemsRemoved: result.itemsRemoved,
        postsRemoved: result.postsRemoved 
      });
      
      return result;
      
    } catch (error) {
      logger.logError('Error during data cleanup', error as Error);
      
      throw new GraphQLError('Failed to cleanup orphaned data', {
        extensions: {
          code: 'CLEANUP_ERROR',
          originalError: (error as Error).message
        }
      });
    }
  }
};

export default mutationResolvers;