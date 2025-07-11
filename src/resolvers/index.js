const queryResolvers = require('./queryResolvers');
const mutationResolvers = require('./mutationResolvers');
const fieldResolvers = require('./fieldResolvers');


const resolvers = {

  Query: {
    ...queryResolvers
  },

  Mutation: {
    ...mutationResolvers
  },

  User: {
    ...fieldResolvers.User
  },

  Post: {
    ...fieldResolvers.Post
  },

  DateTime: fieldResolvers.DateTime
};

module.exports = resolvers;