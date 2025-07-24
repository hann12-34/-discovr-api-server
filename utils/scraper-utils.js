/**
 * Scraper Utility Functions
 * Common utilities for web scraping with Puppeteer
 */

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise<void>}
 */
async function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get a random user agent string
 * @returns {string}
 */
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Scroll page in a human-like manner
 * @param {Page} page - Puppeteer page object
 * @param {number} scrollAmount - Amount to scroll each time
 * @param {number} maxScrolls - Maximum number of scrolls
 * @returns {Promise<void>}
 */
async function humanLikeScroll(page, scrollAmount = 300, maxScrolls = 10) {
  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    // Random delay between scrolls
    await randomDelay(500, 1500);
    
    // Check if we've reached the bottom
    const isAtBottom = await page.evaluate(() => {
      return window.innerHeight + window.scrollY >= document.body.offsetHeight;
    });
    
    if (isAtBottom) break;
  }
}

/**
 * Perform random mouse movements to appear more human-like
 * @param {Page} page - Puppeteer page object
 * @param {number} movements - Number of mouse movements
 * @returns {Promise<void>}
 */
async function randomMouseMovements(page, movements = 3) {
  const viewport = await page.viewport();
  
  for (let i = 0; i < movements; i++) {
    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);
    
    await page.mouse.move(x, y);
    await randomDelay(100, 500);
  }
}

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<any>}
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Emulate browser history by visiting previous pages
 * @param {Page} page - Puppeteer page object
 * @param {Array<string>} urls - URLs to visit for history
 * @returns {Promise<void>}
 */
async function emulateBrowserHistory(page, urls = []) {
  const defaultUrls = [
    'https://www.google.com',
    'https://www.wikipedia.org'
  ];
  
  const historyUrls = urls.length > 0 ? urls : defaultUrls;
  
  for (const url of historyUrls.slice(0, 2)) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      await randomDelay(1000, 2000);
    } catch (error) {
      // Ignore errors in history emulation
      console.log(`History emulation failed for ${url}:`, error.message);
    }
  }
}

module.exports = {
  randomDelay,
  getRandomUserAgent,
  humanLikeScroll,
  randomMouseMovements,
  withRetry,
  emulateBrowserHistory
};
