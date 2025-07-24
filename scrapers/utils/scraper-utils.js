/**
 * Scraper Utility Functions
 * Helper functions to make scrapers more resilient against anti-bot measures
 */

/**
 * Introduces a random delay between actions to mimic human behavior
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise} - Promise that resolves after the delay
 */
function randomDelay(min = 500, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Returns a random user agent string from a curated list of real browser user agents
 * @returns {string} - A random user agent string
 */
function getRandomUserAgent() {
  const userAgents = [
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    
    // Firefox on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/114.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/113.0',
    
    // Safari on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
    
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/113.0',
    
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.57'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Performs interactive scrolling on a page to mimic human behavior
 * @param {Page} page - Puppeteer page object
 * @param {number} scrollSteps - Number of scroll actions to perform
 * @param {number} maxScrollPerStep - Maximum pixels to scroll per step
 */
async function humanLikeScroll(page, scrollSteps = 5, maxScrollPerStep = 800) {
  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = Math.floor(Math.random() * maxScrollPerStep) + 100;
    await page.evaluate((amount) => {
      window.scrollBy(0, amount);
    }, scrollAmount);
    
    // Random delay between scrolls
    await randomDelay(300, 1000);
  }
}

/**
 * Adds a random mouse movement pattern to appear more human-like
 * @param {Page} page - Puppeteer page object
 */
async function randomMouseMovements(page) {
  const viewportWidth = page.viewport().width;
  const viewportHeight = page.viewport().height;
  
  // Generate 3-5 random points to move mouse to
  const movementCount = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < movementCount; i++) {
    const x = Math.floor(Math.random() * viewportWidth);
    const y = Math.floor(Math.random() * viewportHeight);
    
    await page.mouse.move(x, y);
    await randomDelay(100, 500);
  }
}

/**
 * Retry mechanism for page navigation and operations
 * @param {function} operation - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {Promise} - Result of the operation
 */
async function withRetry(operation, maxRetries = 3, retryDelay = 2000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Attempt ${attempt + 1} failed: ${error.message}`);
      lastError = error;
      
      // Add increasing delay between retries
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  
  throw new Error(`All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
}

/**
 * Sets the browser to appear as if it has cookies, history, etc.
 * @param {Page} page - Puppeteer page object
 */
async function emulateBrowserHistory(page) {
  await page.evaluateOnNewDocument(() => {
    // Fake having cookies
    Object.defineProperty(navigator, 'cookieEnabled', { get: () => true });
    
    // Add a fake history
    Object.defineProperty(window.history, 'length', { get: () => Math.floor(Math.random() * 5) + 3 });
    
    // Add fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [{
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer'
        }, {
          name: 'Chrome PDF Viewer',
          filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'
        }, {
          name: 'Native Client',
          filename: 'internal-nacl-plugin'
        }];
      }
    });
  });
}

module.exports = {
  randomDelay,
  getRandomUserAgent,
  humanLikeScroll,
  randomMouseMovements,
  withRetry,
  emulateBrowserHistory
};
