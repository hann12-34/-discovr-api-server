/**
 * Logger utility for scraper monitoring and debugging
 * Provides structured logging with multiple output levels
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logFile = options.logFile || path.join(__dirname, '../../logs/scraper.log');
    this.context = options.context || {};
    
    // Create logs directory if it doesn't exist
    if (this.enableFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  // Create child logger with additional context
  child(contextOptions = {}) {
    return new Logger({
      logLevel: this.logLevel,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      logFile: this.logFile,
      context: { ...this.context, ...contextOptions }
    });
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const combinedMeta = { ...this.context, ...meta };
    const metaStr = Object.keys(combinedMeta).length > 0 ? ` ${JSON.stringify(combinedMeta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  _shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;

    const formattedMessage = this._formatMessage(level, message, meta);

    if (this.enableConsole) {
      console.log(formattedMessage);
    }

    if (this.enableFile) {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    }
  }

  error(message, meta = {}) {
    this._log('error', message, meta);
  }

  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }

  info(message, meta = {}) {
    this._log('info', message, meta);
  }

  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }

  // Scraper-specific logging methods
  scraperStart(scraperName, url) {
    this.info(`Starting scraper: ${scraperName}`, { url, action: 'scraper_start' });
  }

  scraperSuccess(scraperName, eventCount, duration) {
    this.info(`Scraper completed successfully: ${scraperName}`, {
      eventCount,
      duration: `${duration}ms`,
      action: 'scraper_success'
    });
  }

  scraperError(scraperName, error, duration) {
    this.error(`Scraper failed: ${scraperName}`, {
      error: error.message,
      duration: `${duration}ms`,
      action: 'scraper_error'
    });
  }

  scraperEmpty(scraperName, duration) {
    this.warn(`Scraper returned no events: ${scraperName}`, {
      duration: `${duration}ms`,
      action: 'scraper_empty'
    });
  }
}

// Create default logger instance
const defaultLogger = new Logger({
  logLevel: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableFile: process.env.ENABLE_FILE_LOGGING === 'true'
});

// Create scraper-specific logger instance
const scrapeLogger = new Logger({
  logLevel: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
  context: { module: 'scraper' }
});

module.exports = defaultLogger;
module.exports.Logger = Logger;
module.exports.scrapeLogger = scrapeLogger;
