import { GraphQLError, GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { findUserById, findPostsByAuthorId } from '../utils/dataManager';
import type { User, Post, GraphQLContext } from '../types';
import logger from '../utils/logger';

const fieldResolvers = {

  User: {

    posts: async (parent: User, _args: any, _context: GraphQLContext): Promise<Post[]> => {
      try {
        logger.debug('Resolving posts for user', { userId: parent.id, userName: parent.name });
        
        const posts = await findPostsByAuthorId(parent.id);
        
        logger.debug('Posts resolved for user', { 
          userId: parent.id, 
          userName: parent.name,
          postCount: posts.length 
        });
        
        return posts;
      } catch (error) {
        logger.logError('Error resolving posts for user', error as Error, { 
          userId: parent.id, 
          userName: parent.name 
        });
        
        throw new GraphQLError('Failed to resolve user posts', {
          extensions: {
            code: 'RESOLVE_USER_POSTS_ERROR',
            userId: parent.id,
            originalError: (error as Error).message
          }
        });
      }
    }
  },

  Post: {

    author: async (parent: Post, _args: any, _context: GraphQLContext): Promise<User> => {
      try {
        logger.debug('Resolving author for post', { 
          postId: parent.id, 
          postTitle: parent.title, 
          authorId: parent.authorId 
        });
        
        if ('author' in parent && parent.author && typeof parent.author === 'object' && 'name' in parent.author) {
          logger.debug('Author already populated for post', { 
            postId: parent.id, 
            authorId: (parent.author as User).id,
            authorName: (parent.author as User).name 
          });
          return parent.author as User;
        }
        
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
        
        logger.logError('Error resolving author for post', error as Error, { 
          postId: parent.id, 
          postTitle: parent.title,
          authorId: parent.authorId 
        });
        
        throw new GraphQLError('Failed to resolve post author', {
          extensions: {
            code: 'RESOLVE_POST_AUTHOR_ERROR',
            postId: parent.id,
            authorId: parent.authorId,
            originalError: (error as Error).message
          }
        });
      }
    }
  },


  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'Date custom scalar type',
    
    serialize(value: unknown): string {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date value');
        }
        return date.toISOString();
      }
      if (typeof value === 'number') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date timestamp');
        }
        return date.toISOString();
      }
      throw new GraphQLError('Value must be a Date object, ISO string, or timestamp');
    },

    parseValue(value: unknown): Date {
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date format');
        }
        return date;
      }
      if (typeof value === 'number') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date timestamp');
        }
        return date;
      }
      throw new GraphQLError('Value must be a string or number');
    },

    parseLiteral(ast): Date {
      if (ast.kind === Kind.STRING) {
        const date = new Date(ast.value);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date format');
        }
        return date;
      }
      if (ast.kind === Kind.INT) {
        const timestamp = parseInt(ast.value, 10);
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          throw new GraphQLError('Invalid date timestamp');
        }
        return date;
      }
      throw new GraphQLError('Value must be a string or integer');
    }
  })
};

export default fieldResolvers;