/**
 * Logger configuration
 */
const colors = require('colors/safe');

// Simple logger implementation
const createLogger = (name = 'app') => {
  const timestamp = () => new Date().toISOString();
  
  return {
    info: (message, ...args) => {
      console.log(colors.green(`[${timestamp()}] [${name}] [INFO] ${message}`), ...args);
    },
    
    warn: (message, ...args) => {
      console.warn(colors.yellow(`[${timestamp()}] [${name}] [WARN] ${message}`), ...args);
    },
    
    error: (message, ...args) => {
      console.error(colors.red(`[${timestamp()}] [${name}] [ERROR] ${message}`), ...args);
    },
    
    debug: (message, ...args) => {
      if (process.env.DEBUG === 'true') {
        console.debug(colors.blue(`[${timestamp()}] [${name}] [DEBUG] ${message}`), ...args);
      }
    },
    
    child: (options) => {
      const childName = options.scraper || name;
      return createLogger(childName);
    }
  };
};

// Create default loggers
const appLogger = createLogger('app');
const scrapeLogger = createLogger('scraper');

module.exports = {
  appLogger,
  scrapeLogger,
  createLogger
};
