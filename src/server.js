const express = require('express');
const { createYoga } = require('graphql-yoga');
const { createServer } = require('http');
require('dotenv').config();

// Import schema and resolvers
const typeDefs = require('./schema/typeDefs');
const resolvers = require('./resolvers');

// Import utilities
const logger = require('./utils/logger');
const { validateEnvironment } = require('./utils/validation');

// Validate environment variables
validateEnvironment();

// Create Express app
const app = express();

// Middleware for request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
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

// Create GraphQL Yoga server
const yoga = createYoga({
  schema: {
    typeDefs,
    resolvers
  },
  context: ({ request }) => {
    return {
      request,
      // Add any context data here
      timestamp: new Date().toISOString()
    };
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || false
      : true,
    credentials: true
  },
  graphiql: process.env.NODE_ENV === 'development',
  maskedErrors: process.env.NODE_ENV === 'production',
  logging: {
    debug: (...args) => logger.debug(...args),
    info: (...args) => logger.info(...args),
    warn: (...args) => logger.warn(...args),
    error: (...args) => logger.error(...args)
  }
});

// Use GraphQL Yoga as middleware
app.use('/graphql', yoga);

// Root endpoint redirect
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    res.redirect('/graphql');
  } else {
    res.json({
      message: 'GraphQL API Server',
      version: process.env.npm_package_version || '1.0.0',
      endpoints: {
        graphql: '/graphql',
        health: '/health'
      }
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: ['/graphql', '/health']
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  // Don't expose error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  } else {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Create HTTP server
const server = createServer(app);

// Server configuration
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';

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
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
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
const startServer = async () => {
  try {
    await new Promise((resolve, reject) => {
      server.listen(PORT, HOST, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    logger.info(`🚀 Server running at http://${HOST}:${PORT}`);
    logger.info(`📊 GraphQL endpoint: http://${HOST}:${PORT}/graphql`);
    logger.info(`🔍 Health check: http://${HOST}:${PORT}/health`);
    
    if (process.env.NODE_ENV === 'development') {
      logger.info(`🎮 GraphQL Playground: http://${HOST}:${PORT}/graphql`);
    }
    
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
module.exports = { app, server };