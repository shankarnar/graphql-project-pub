import { createYoga, createSchema } from 'graphql-yoga';
import { createServer } from 'http';
import express from 'express';
import * as dotenv from 'dotenv';

import type { GraphQLContext, EnvironmentConfig } from './types';

import typeDefs from './schema/typeDefs';
import resolvers from './resolvers';

import logger from './utils/logger';
import { validateEnvironment } from './utils/validators';

dotenv.config();

validateEnvironment();

const config: EnvironmentConfig = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATA_FILE_PATH: process.env.DATA_FILE_PATH || './src/data/data.json',
  LOG_LEVEL: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
};

const app = express();

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'GraphQL API Server (TypeScript)',
    version: process.env.npm_package_version || '1.0.0',
    graphql: '/graphql',
    health: '/health',
    environment: config.NODE_ENV
  });
});

const schema = createSchema({
  typeDefs,
  resolvers
});

const yoga = createYoga({
  schema,
  context: async ({ request }): Promise<GraphQLContext> => {
    return {
      request,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'unknown'
    };
  },
  cors: {
    origin: '*',
    credentials: false
  },
  graphiql: config.NODE_ENV !== 'production',
  logging: {
    debug: (...args: any[]) => logger.debug('GraphQL Debug', { args }),
    info: (...args: any[]) => logger.info('GraphQL Info', { args }),
    warn: (...args: any[]) => logger.warn('GraphQL Warning', { args }),
    error: (...args: any[]) => logger.error('GraphQL Error', { args })
  }
});

app.use('/graphql', yoga as any);

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

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.logError('Unhandled Error', error, {
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

const server = createServer(app);

const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', err);
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.logError('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});


const PORT = process.env.PORT || 4000;

server.listen(config.PORT, () => {
  logger.info(` Server is running on http://localhost:${config.PORT}`);
  logger.info(` GraphQL endpoint available at http://localhost:${config.PORT}/graphql`);
  logger.info(` Health check available at http://localhost:${config.PORT}/health`);
  
  if (config.NODE_ENV !== 'production') {
    logger.info(`🎮 GraphQL Playground available at http://localhost:${config.PORT}/graphql`);
  }
  
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Data file path: ${config.DATA_FILE_PATH}`);
});


export { app, server, config };