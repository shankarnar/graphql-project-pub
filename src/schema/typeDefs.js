const typeDefs = `
  # Scalar types
  scalar DateTime

  # User type definition
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Post type definition
  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
    authorId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
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
    authorId: String!
    published: Boolean
  }

  input UpdatePostInput {
    title: String
    content: String
    published: Boolean
    authorId: String
  }

  # Search input type
  input SearchInput {
    term: String!
    limit: Int
    offset: Int
  }

  # Response types for operations
  type DeleteResponse {
    id: ID!
    message: String!
  }

  type Stats {
    totalUsers: Int!
    totalPosts: Int!
    publishedPosts: Int!
    unpublishedPosts: Int!
    usersWithPosts: Int!
    usersWithoutPosts: Int!
  }

  type DataIntegrityIssue {
    type: String!
    count: Int!
    items: [String!]!
  }

  type IntegrityReport {
    isValid: Boolean!
    issues: [DataIntegrityIssue!]!
  }

  type CleanupResult {
    itemsRemoved: Int!
    postsRemoved: Int!
  }

  # Query type definition
  type Query {
    # User queries
    users: [User!]!
    user(id: ID!): User
    searchUsers(input: SearchInput!): [User!]!
    
    # Post queries
    posts: [Post!]!
    post(id: ID!): Post
    publishedPosts: [Post!]!
    postsByAuthor(authorId: ID!): [Post!]!
    searchPosts(input: SearchInput!): [Post!]!
    
    # Utility queries
    stats: Stats!
    validateIntegrity: IntegrityReport!
    
    # Health check
    health: String!
  }

  # Mutation type definition
  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): DeleteResponse!
    
    # Post mutations
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): DeleteResponse!
    togglePostPublished(id: ID!): Post!
    
    # Utility mutations
    cleanupOrphanedData: CleanupResult!
  }

  # Subscription type definition (for future use)
  type Subscription {
    userCreated: User!
    postCreated: Post!
    postPublished: Post!
  }
`;

module.exports = typeDefs;