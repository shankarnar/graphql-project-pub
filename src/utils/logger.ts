import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from '../types';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const currentLevelNum = LogLevel[currentLevel.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;

const formatMessage = (level: string, message: string, meta: Record<string, any> = {}): string => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
};


const writeToFile = (level: string, formattedMessage: string): void => {
  try {
    const logFile = path.join(logsDir, `${level}.log`);
    const combinedFile = path.join(logsDir, 'combined.log');
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
    fs.appendFileSync(combinedFile, formattedMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};


const log = (level: keyof typeof LogLevel, message: string, meta: Record<string, any> = {}): void => {
  const levelNum = LogLevel[level];
  if (levelNum === undefined || levelNum > currentLevelNum) {
    return;
  }
  
  const formattedMessage = formatMessage(level.toLowerCase(), message, meta);
  

  if (process.env.NODE_ENV !== 'production' || level === 'ERROR' || level === 'WARN') {
    const colors = {
      ERROR: '\x1b[31m',    // Red
      WARN: '\x1b[33m',     // Yellow
      INFO: '\x1b[36m',     // Cyan
      DEBUG: '\x1b[90m',    // Gray
      RESET: '\x1b[0m'      // Reset
    };
    
    const color = colors[level] || colors.RESET;
    console.log(`${color}${formattedMessage}${colors.RESET}`);
  }
  

  writeToFile(level.toLowerCase(), formattedMessage);
};


const logger: Logger = {
  error: (message: string, meta?: Record<string, any>) => log('ERROR', message, meta),
  warn: (message: string, meta?: Record<string, any>) => log('WARN', message, meta),
  info: (message: string, meta?: Record<string, any>) => log('INFO', message, meta),
  debug: (message: string, meta?: Record<string, any>) => log('DEBUG', message, meta),
  
  logError: (message: string, error: Error, context: Record<string, any> = {}) => {
    logger.error(message, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...context
    });
  },
  
  logGraphQLError: (error: Error, context: Record<string, any> = {}) => {
    logger.error('GraphQL Error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  },
  
  logPerformance: (operation: string, duration: number, context: Record<string, any> = {}) => {
    const logLevel = duration > 1000 ? 'warn' : 'info';
    const logMethod = logLevel === 'warn' ? logger.warn : logger.info;
    
    logMethod(`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      slow: duration > 1000,
      ...context
    });
  }
};

export const setLogLevel = (level: keyof typeof LogLevel): void => {
  process.env.LOG_LEVEL = level.toLowerCase();
};

export const getLogLevel = (): string => {
  return currentLevel;
};

export const clearLogs = (): void => {
  try {
    const logFiles = ['error.log', 'warn.log', 'info.log', 'debug.log', 'combined.log'];
    logFiles.forEach(file => {
      const filePath = path.join(logsDir, file);
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
      }
    });
  } catch (error) {
    console.error('Failed to clear log files:', error);
  }
};

export default logger;