/**
 * Scraper Helper Utilities
 * 
 * Provides common functionality to help scrapers be more robust
 * against common failure scenarios.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Create an axios instance with enhanced scraper capabilities
 * @param {Object} options - Configuration options
 * @returns {Object} Configured axios instance
 */
function createScraperClient(options = {}) {
  const defaultHeaders = {
    'User-Agent': options.userAgent || config.scrapers.userAgent || 
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    // Add a random request ID to help avoid caching/tracking
    'X-Request-ID': uuidv4()
  };

  // Merge with any custom headers
  const headers = {
    ...defaultHeaders,
    ...(options.headers || {})
  };

  return axios.create({
    timeout: options.timeout || config.scrapers.timeout || 30000,
    headers,
    // Automatically follow redirects
    maxRedirects: options.maxRedirects || 5,
    // Add random delay to appear more human-like
    ...(options.randomDelay && { 
      transformRequest: [
        (data, headers) => {
          return new Promise(resolve => {
            const delay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms delay
            setTimeout(() => resolve(data), delay);
          });
        },
        ...axios.defaults.transformRequest
      ]
    })
  });
}

/**
 * Retry a function multiple times with backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Promise resolving to fn result
 */
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || config.scrapers.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 10000;
  const logger = options.logger;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // If we're not on the first attempt, apply a delay
      if (attempt > 1) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        if (logger) logger.info(`Retry attempt ${attempt} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (logger) {
        logger.warn(`Attempt ${attempt} failed: ${error.message}`);
      }
      
      // If we've reached max retries, throw the last error
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }
  
  // This should never be reached due to the throw above
  throw lastError;
}

/**
 * Fetch a URL with enhanced scraper capabilities and retries
 * @param {String} url - URL to fetch
 * @param {Object} options - Request and retry options
 * @returns {Promise<Object>} - Axios response
 */
async function fetchWithRetry(url, options = {}) {
  const client = createScraperClient(options);
  const logger = options.logger;
  
  if (logger) logger.info(`Fetching ${url} with retry logic`);
  
  return withRetry(
    async () => client.get(url),
    {
      maxRetries: options.maxRetries,
      initialDelay: options.initialDelay,
      maxDelay: options.maxDelay,
      logger
    }
  );
}

module.exports = {
  createScraperClient,
  withRetry,
  fetchWithRetry
};
