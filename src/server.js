const { createYoga } = require('graphql-yoga');
const { createServer } = require('http');
const express = require('express');
const path = require('path');
require('dotenv').config();

// Import schema and resolvers
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');

// Import utilities
const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/validators');

// Validate environment variables
validateEnvironment();

// Create Express app
const app = express();

// Middleware for logging requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GraphQL API Server',
    version: process.env.npm_package_version || '1.0.0',
    graphql: '/graphql',
    health: '/health',
    environment: process.env.NODE_ENV
  });
});

// Create GraphQL Yoga server
const yoga = createYoga({
  typeDefs,
  resolvers,
  context: async ({ request }) => {
    // Add request context
    return {
      request,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown'
    };
  },
  // Error handling
  maskedErrors: process.env.NODE_ENV === 'production',
  // CORS configuration - simplified
  cors: {
    origin: '*',
    credentials: false
  },
  // GraphQL Playground (only in development)
  graphiql: process.env.NODE_ENV !== 'production',
  // Custom error formatter
  formatError: (error) => {
    logger.error('GraphQL Error:', {
      message: error.message,
      locations: error.locations,
      path: error.path,
      stack: error.stack
    });
    
    // Return sanitized error in production
    if (process.env.NODE_ENV === 'production') {
      return {
        message: error.message,
        locations: error.locations,
        path: error.path
      };
    }
    
    return error;
  }
});

// Mount GraphQL endpoint
app.use('/graphql', yoga);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    availableEndpoints: {
      graphql: '/graphql',
      health: '/health',
      root: '/'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

// Get port from environment or default to 4000
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = createServer(app);

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 Server is running on http://localhost:${PORT}`);
  logger.info(`🔍 GraphQL endpoint available at http://localhost:${PORT}/graphql`);
  logger.info(`❤️  Health check available at http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`🎮 GraphQL Playground available at http://localhost:${PORT}/graphql`);
  }
  
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Export server for testing
module.exports = { app, server };