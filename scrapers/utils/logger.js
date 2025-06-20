/**
 * Logger utility for scrapers
 * Provides a consistent logging interface for all scrapers
 */

// Simple logger that wraps console methods
const scrapeLogger = {
  // Base logger
  info: (message) => {
    if (typeof message === 'object') {
      console.log(`[INFO] ${JSON.stringify(message)}`);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },
  
  error: (context, message) => {
    if (typeof context === 'object' && context.error) {
      console.error(`[ERROR] ${message || 'Error occurred'}:`, context.error.message || context.error);
    } else {
      console.error(`[ERROR] ${context}`);
    }
  },
  
  warn: (message) => {
    console.warn(`[WARN] ${message}`);
  },
  
  debug: (message) => {
    if (process.env.DEBUG) {
      if (typeof message === 'object') {
        console.log(`[DEBUG] ${JSON.stringify(message)}`);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },
  
  // Create child logger with context
  child: (context) => {
    return {
      info: (message) => {
        if (typeof message === 'object') {
          console.log(`[INFO][${context.scraper || JSON.stringify(context)}] ${JSON.stringify(message)}`);
        } else {
          console.log(`[INFO][${context.scraper || JSON.stringify(context)}] ${message}`);
        }
      },
      
      error: (errorContext, message) => {
        if (typeof errorContext === 'object' && errorContext.error) {
          console.error(`[ERROR][${context.scraper || JSON.stringify(context)}] ${message || 'Error occurred'}:`, 
            errorContext.error.message || errorContext.error);
        } else {
          console.error(`[ERROR][${context.scraper || JSON.stringify(context)}] ${errorContext}`);
        }
      },
      
      warn: (message) => {
        console.warn(`[WARN][${context.scraper || JSON.stringify(context)}] ${message}`);
      },
      
      debug: (message) => {
        if (process.env.DEBUG) {
          if (typeof message === 'object') {
            console.log(`[DEBUG][${context.scraper || JSON.stringify(context)}] ${JSON.stringify(message)}`);
          } else {
            console.log(`[DEBUG][${context.scraper || JSON.stringify(context)}] ${message}`);
          }
        }
      }
    };
  }
};

module.exports = {
  scrapeLogger
};
