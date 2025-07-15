#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function setupEnvironment() {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
    console.log('⚠️  NODE_ENV not set, defaulting to "development"');
  }
  
  if (!process.env.DATA_FILE_PATH) {
    process.env.DATA_FILE_PATH = './src/data/data.json';
    console.log('⚠️  DATA_FILE_PATH not set, defaulting to "./src/data/data.json"');
  }
  
  if (!process.env.PORT) {
    process.env.PORT = '4000';
    console.log('⚠️  PORT not set, defaulting to 4000');
  }
  
  if (!process.env.LOG_LEVEL) {
    process.env.LOG_LEVEL = 'debug';
  }
  
  console.log('✅ Environment variables configured');
}

function setupDirectories() {
  const dataDir = path.dirname(path.resolve(process.env.DATA_FILE_PATH));
  const logsDir = path.resolve('./logs');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Created data directory: ${dataDir}`);
  }
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`📁 Created logs directory: ${logsDir}`);
  }
  
  const dataFilePath = path.resolve(process.env.DATA_FILE_PATH);
  if (!fs.existsSync(dataFilePath)) {
    const defaultData = {
      users: [
        {
          id: "1",
          name: "Ajay bose",
          email: "ajaya.bose@example.com",
          posts: ["1", "2"],
          createdAt: "2025-01-01T10:00:00.000Z",
          updatedAt: "2025-01-01T10:00:00.000Z"
        },
        {
          id: "2",
          name: "Balaji",
          email: "balaji.s@example.com",
          posts: ["3"],
          createdAt: "2025-01-02T10:00:00.000Z",
          updatedAt: "2025-01-02T10:00:00.000Z"
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
    
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2));
    console.log(`📄 Created default data file: ${dataFilePath}`);
  }
}

// Main setup function
function setup() {
  console.log('🚀 Setting up GraphQL API environment...\n');
  
  setupEnvironment();
  setupDirectories();
  
  console.log('\n✅ Setup completed successfully!');
  console.log('You can now run:');
  console.log('  npm run dev     - Start development server');
  console.log('  npm run build   - Build for production');
  console.log('  npm start       - Start production server');
}

// Run setup if this script is executed directly
if (require.main === module) {
  setup();
}

module.exports = { setup, setupEnvironment, setupDirectories };