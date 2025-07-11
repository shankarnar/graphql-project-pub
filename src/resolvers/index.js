const queryResolvers = require('./queryResolvers');
const mutationResolvers = require('./mutationResolvers');
const fieldResolvers = require('./fieldResolvers');

/**
 * Combined resolvers object for GraphQL schema
 */
const resolvers = {
  // Query resolvers
  Query: {
    ...queryResolvers
  },

  // Mutation resolvers
  Mutation: {
    ...mutationResolvers
  },

  // Field resolvers for complex types
  User: {
    ...fieldResolvers.User
  },

  Post: {
    ...fieldResolvers.Post
  },

  // Custom scalar resolvers
  DateTime: fieldResolvers.DateTime
};

module.exports = resolvers;