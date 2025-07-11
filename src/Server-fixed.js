const { createYoga, createSchema } = require('graphql-yoga');
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
    console.log('Using default data (data.json not found)');
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
        },
        {
          id: "3",
          name: "Mike Johnson",
          email: "mike.johnson@example.com",
          posts: [],
          createdAt: "2025-01-03T10:00:00.000Z",
          updatedAt: "2025-01-03T10:00:00.000Z"
        }
      ],
      posts: [
        {
          id: "1",
          title: "Getting Started with GraphQL",
          content: "GraphQL is a powerful query language for APIs that provides a complete and understandable description of the data in your API.",
          published: true,
          authorId: "1",
          createdAt: "2025-01-01T11:00:00.000Z",
          updatedAt: "2025-01-01T11:00:00.000Z"
        },
        {
          id: "2",
          title: "Building APIs with Node.js", 
          content: "Node.js is an excellent choice for building APIs due to its non-blocking I/O model and extensive package ecosystem.",
          published: true,
          authorId: "1",
          createdAt: "2025-01-01T12:00:00.000Z",
          updatedAt: "2025-01-01T12:00:00.000Z"
        },
        {
          id: "3",
          title: "Draft: Advanced GraphQL Patterns",
          content: "This post will cover advanced GraphQL patterns including federation, subscriptions, and schema stitching.",
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
const typeDefs = /* GraphQL */ `
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
    published: Boolean = false
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
    hello: () => {
      console.log('Hello query called');
      return 'Hello from GraphQL API! 🚀';
    },
    
    users: async () => {
      console.log('Users query called');
      try {
        const data = await readData();
        console.log('Found users:', data.users.length);
        return data.users;
      } catch (error) {
        console.error('Error in users resolver:', error);
        throw new Error('Failed to fetch users');
      }
    },
    
    user: async (parent, { id }) => {
      console.log('User query called with id:', id);
      try {
        const data = await readData();
        const user = data.users.find(user => user.id === id);
        if (!user) {
          throw new Error(`User with id ${id} not found`);
        }
        console.log('Found user:', user.name);
        return user;
      } catch (error) {
        console.error('Error in user resolver:', error);
        throw error;
      }
    },
    
    posts: async () => {
      console.log('Posts query called');
      try {
        const data = await readData();
        console.log('Found posts:', data.posts.length);
        return data.posts;
      } catch (error) {
        console.error('Error in posts resolver:', error);
        throw new Error('Failed to fetch posts');
      }
    },
    
    post: async (parent, { id }) => {
      console.log('Post query called with id:', id);
      try {
        const data = await readData();
        const post = data.posts.find(post => post.id === id);
        if (!post) {
          throw new Error(`Post with id ${id} not found`);
        }
        console.log('Found post:', post.title);
        return post;
      } catch (error) {
        console.error('Error in post resolver:', error);
        throw error;
      }
    },
    
    publishedPosts: async () => {
      console.log('Published posts query called');
      try {
        const data = await readData();
        const published = data.posts.filter(post => post.published);
        console.log('Found published posts:', published.length);
        return published;
      } catch (error) {
        console.error('Error in publishedPosts resolver:', error);
        throw new Error('Failed to fetch published posts');
      }
    }
  },

  Mutation: {
    createUser: async (parent, { input }) => {
      console.log('Create user mutation called with input:', input);
      try {
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
        
        console.log('Created user:', newUser.name);
        return newUser;
      } catch (error) {
        console.error('Error in createUser mutation:', error);
        throw error;
      }
    },
    
    updateUser: async (parent, { id, input }) => {
      console.log('Update user mutation called:', { id, input });
      try {
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
        
        console.log('Updated user:', updatedUser.name);
        return updatedUser;
      } catch (error) {
        console.error('Error in updateUser mutation:', error);
        throw error;
      }
    },
    
    deleteUser: async (parent, { id }) => {
      console.log('Delete user mutation called with id:', id);
      try {
        const data = await readData();
        
        const userIndex = data.users.findIndex(user => user.id === id);
        if (userIndex === -1) {
          throw new Error('User not found');
        }
        
        const user = data.users[userIndex];
        
        // Remove user
        data.users.splice(userIndex, 1);
        
        // Remove user's posts
        const removedPosts = data.posts.filter(post => post.authorId === id);
        data.posts = data.posts.filter(post => post.authorId !== id);
        
        await writeData(data);
        
        console.log('Deleted user:', user.name, 'and', removedPosts.length, 'posts');
        return {
          id: user.id,
          message: `User '${user.name}' and ${removedPosts.length} posts deleted successfully`
        };
      } catch (error) {
        console.error('Error in deleteUser mutation:', error);
        throw error;
      }
    },
    
    createPost: async (parent, { input }) => {
      console.log('Create post mutation called with input:', input);
      try {
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
        if (authorIndex !== -1) {
          data.users[authorIndex].posts.push(newPost.id);
          data.users[authorIndex].updatedAt = new Date().toISOString();
        }
        
        await writeData(data);
        
        console.log('Created post:', newPost.title);
        return newPost;
      } catch (error) {
        console.error('Error in createPost mutation:', error);
        throw error;
      }
    }
  },

  // Field resolvers
  User: {
    posts: async (parent) => {
      try {
        const data = await readData();
        const userPosts = data.posts.filter(post => post.authorId === parent.id);
        console.log(`Found ${userPosts.length} posts for user ${parent.name}`);
        return userPosts;
      } catch (error) {
        console.error('Error resolving user posts:', error);
        return [];
      }
    }
  },

  Post: {
    author: async (parent) => {
      try {
        const data = await readData();
        const author = data.users.find(user => user.id === parent.authorId);
        if (!author) {
          throw new Error('Author not found for post');
        }
        console.log(`Found author ${author.name} for post ${parent.title}`);
        return author;
      } catch (error) {
        console.error('Error resolving post author:', error);
        throw error;
      }
    }
  }
};

// Create schema using createSchema
const schema = createSchema({
  typeDefs,
  resolvers
});

// Create GraphQL server with explicit schema
const yoga = createYoga({
  schema,
  cors: {
    origin: '*',
    credentials: false
  },
  graphiql: true,
  logging: {
    debug: (...args) => {
      console.log('GraphQL Debug:', ...args);
    },
    info: (...args) => {
      console.log('GraphQL Info:', ...args);
    },
    warn: (...args) => {
      console.warn('GraphQL Warning:', ...args);
    },
    error: (...args) => {
      console.error('GraphQL Error:', ...args);
    }
  }
});

const server = createServer(yoga);
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
  console.log(`📊 GraphQL Playground available for testing`);
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`📁 Data file path: ${DATA_FILE_PATH}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { server };