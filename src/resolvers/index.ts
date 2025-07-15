import type { QueryResolvers, MutationResolvers, FieldResolvers } from '../types';
import queryResolvers from './queryResolvers';
import mutationResolvers from './mutationResolvers';
import fieldResolvers from './fieldResolvers';

/**
 * Combined resolvers object for GraphQL schema
 */
const resolvers = {
  // Query resolvers
  Query: queryResolvers,

  // Mutation resolvers
  Mutation: mutationResolvers,

  // Field resolvers for complex types
  User: fieldResolvers.User,
  Post: fieldResolvers.Post,

  // Custom scalar resolvers
  DateTime: fieldResolvers.DateTime
};

export default resolvers;