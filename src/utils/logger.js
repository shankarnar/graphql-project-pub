// Simple logger implementation without external dependencies
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const currentLevelNum = logLevels[currentLevel] || logLevels.info;

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
};

const writeToFile = (level, formattedMessage) => {
  try {
    const logFile = path.join(logsDir, `${level}.log`);
    const combinedFile = path.join(logsDir, 'combined.log');
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
    fs.appendFileSync(combinedFile, formattedMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

const log = (level, message, meta = {}) => {
  const levelNum = logLevels[level];
  if (levelNum === undefined || levelNum > currentLevelNum) {
    return;
  }
  
  const formattedMessage = formatMessage(level, message, meta);
  
  // Console output
  if (process.env.NODE_ENV !== 'production' || level === 'error' || level === 'warn') {
    console.log(formattedMessage);
  }
  
  // File output
  writeToFile(level, formattedMessage);
};

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
  
  // Helper methods
  logError: (message, error, context = {}) => {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...context
    });
  },
  
  logGraphQLError: (error, context = {}) => {
    logger.error('GraphQL Error', {
      message: error.message,
      locations: error.locations,
      path: error.path,
      source: error.source,
      ...context
    });
  },
  
  logPerformance: (operation, duration, context = {}) => {
    const logLevel = duration > 1000 ? 'warn' : 'info';
    log(logLevel, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...context
    });
  }
};

module.exports = logger;