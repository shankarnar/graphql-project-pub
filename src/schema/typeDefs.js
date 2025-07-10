const { gql } = require('graphql-yoga');

const typeDefs = gql`
  # User type definition
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    createdAt: String!
    updatedAt: String!
  }

  # Post type definition
  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    authorId: ID!
    createdAt: String!
    updatedAt: String!
  }

  # Input types for mutations
  input CreateUserInput {
    name: String!
    email: String!
  }

  input UpdateUserInput {
    name: String
    email: String
  }

  input CreatePostInput {
    title: String!
    content: String!
    authorId: ID!
  }

  input UpdatePostInput {
    title: String
    content: String
    authorId: ID
  }

  # Success response type
  type MutationResponse {
    success: Boolean!
    message: String!
    data: User
  }

  type PostMutationResponse {
    success: Boolean!
    message: String!
    data: Post
  }

  # Query operations
  type Query {
    # User queries
    users: [User!]!
    user(id: ID!): User
    
    # Post queries
    posts: [Post!]!
    post(id: ID!): Post
    postsByAuthor(authorId: ID!): [Post!]!
    
    # Search queries
    searchUsers(query: String!): [User!]!
    searchPosts(query: String!): [Post!]!
    
    # Statistics
    userCount: Int!
    postCount: Int!
  }

  # Mutation operations
  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): MutationResponse!
    
    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): PostMutationResponse!
  }
`;

module.exports = typeDefs;