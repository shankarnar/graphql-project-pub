const { createYoga } = require('graphql-yoga');
const { createServer } = require('http');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Data file path
const DATA_FILE_PATH = path.resolve(process.env.DATA_FILE_PATH || './src/data/data.json');

// Read data from JSON file
const readData = async () => {
  try {
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading data file:', error);
    // Return default data if file doesn't exist
    return {
      users: [
        {
          id: "1",
          name: "John Doe",
          email: "john.doe@example.com",
          posts: ["1", "2"],
          createdAt: "2025-01-01T10:00:00.000Z",
          updatedAt: "2025-01-01T10:00:00.000Z"
        },
        {
          id: "2", 
          name: "Jane Smith",
          email: "jane.smith@example.com",
          posts: ["3"],
          createdAt: "2025-01-02T10:00:00.000Z",
          updatedAt: "2025-01-02T10:00:00.000Z"
        }
      ],
      posts: [
        {
          id: "1",
          title: "Getting Started with GraphQL",
          content: "GraphQL is a powerful query language for APIs...",
          published: true,
          authorId: "1",
          createdAt: "2025-01-01T11:00:00.000Z",
          updatedAt: "2025-01-01T11:00:00.000Z"
        },
        {
          id: "2",
          title: "Building APIs with Node.js", 
          content: "Node.js is an excellent choice for building APIs...",
          published: true,
          authorId: "1",
          createdAt: "2025-01-01T12:00:00.000Z",
          updatedAt: "2025-01-01T12:00:00.000Z"
        },
        {
          id: "3",
          title: "Draft: Advanced GraphQL Patterns",
          content: "This post will cover advanced GraphQL patterns...",
          published: false,
          authorId: "2",
          createdAt: "2025-01-02T11:00:00.000Z",
          updatedAt: "2025-01-02T11:00:00.000Z"
        }
      ]
    };
  }
};

// Write data to JSON file
const writeData = async (data) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(DATA_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(DATA_FILE_PATH, jsonContent, 'utf8');
    console.log('Data written successfully');
  } catch (error) {
    console.error('Error writing data file:', error);
    throw error;
  }
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// GraphQL Schema
const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    createdAt: String!
    updatedAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
    authorId: String!
    createdAt: String!
    updatedAt: String!
  }

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

  type DeleteResponse {
    id: ID!
    message: String!
  }

  type Query {
    hello: String!
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
    post(id: ID!): Post
    publishedPosts: [Post!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): DeleteResponse!
    createPost(input: CreatePostInput!): Post!
  }
`;

// GraphQL Resolvers
const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL API! 🚀',
    
    users: async () => {
      const data = await readData();
      return data.users;
    },
    
    user: async (parent, { id }) => {
      const data = await readData();
      const user = data.users.find(user => user.id === id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    },
    
    posts: async () => {
      const data = await readData();
      return data.posts;
    },
    
    post: async (parent, { id }) => {
      const data = await readData();
      const post = data.posts.find(post => post.id === id);
      if (!post) {
        throw new Error('Post not found');
      }
      return post;
    },
    
    publishedPosts: async () => {
      const data = await readData();
      return data.posts.filter(post => post.published);
    }
  },

  Mutation: {
    createUser: async (parent, { input }) => {
      const data = await readData();
      
      // Check if email already exists
      const existingUser = data.users.find(user => user.email === input.email);
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }
      
      const newUser = {
        id: generateId(),
        name: input.name,
        email: input.email,
        posts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      data.users.push(newUser);
      await writeData(data);
      
      return newUser;
    },
    
    updateUser: async (parent, { id, input }) => {
      const data = await readData();
      
      const userIndex = data.users.findIndex(user => user.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Check email uniqueness if email is being updated
      if (input.email) {
        const emailExists = data.users.some(user => user.id !== id && user.email === input.email);
        if (emailExists) {
          throw new Error('A user with this email already exists');
        }
      }
      
      const updatedUser = {
        ...data.users[userIndex],
        ...input,
        updatedAt: new Date().toISOString()
      };
      
      data.users[userIndex] = updatedUser;
      await writeData(data);
      
      return updatedUser;
    },
    
    deleteUser: async (parent, { id }) => {
      const data = await readData();
      
      const userIndex = data.users.findIndex(user => user.id === id);
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      const user = data.users[userIndex];
      
      // Remove user
      data.users.splice(userIndex, 1);
      
      // Remove user's posts
      data.posts = data.posts.filter(post => post.authorId !== id);
      
      await writeData(data);
      
      return {
        id: user.id,
        message: `User '${user.name}' deleted successfully`
      };
    },
    
    createPost: async (parent, { input }) => {
      const data = await readData();
      
      // Check if author exists
      const author = data.users.find(user => user.id === input.authorId);
      if (!author) {
        throw new Error('Author not found');
      }
      
      const newPost = {
        id: generateId(),
        title: input.title,
        content: input.content,
        authorId: input.authorId,
        published: input.published || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      data.posts.push(newPost);
      
      // Add post to author's posts array
      const authorIndex = data.users.findIndex(user => user.id === input.authorId);
      data.users[authorIndex].posts.push(newPost.id);
      data.users[authorIndex].updatedAt = new Date().toISOString();
      
      await writeData(data);
      
      return newPost;
    }
  },

  // Field resolvers
  User: {
    posts: async (parent) => {
      const data = await readData();
      return data.posts.filter(post => post.authorId === parent.id);
    }
  },

  Post: {
    author: async (parent) => {
      const data = await readData();
      const author = data.users.find(user => user.id === parent.authorId);
      if (!author) {
        throw new Error('Author not found');
      }
      return author;
    }
  }
};

// Create GraphQL server
const yoga = createYoga({
  typeDefs,
  resolvers,
  cors: {
    origin: '*',
    credentials: false
  },
  graphiql: true,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      locations: error.locations,
      path: error.path
    };
  }
});

const server = createServer(yoga);
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
  console.log(`📊 GraphQL Playground available for testing`);
});

module.exports = { server };