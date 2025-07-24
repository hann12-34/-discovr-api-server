/**
 * Puppeteer stealth setup utility
 * 
 * This module provides a configured puppeteer instance with stealth plugins
 * to bypass anti-bot detection systems on modern websites.
 */

// Import required packages
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

// Apply the stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Launch a stealth puppeteer browser instance
 * 
 * @param {Object} options - Additional puppeteer launch options
 * @returns {Promise<Browser>} - A puppeteer browser instance with stealth capabilities
 */
async function launchStealthBrowser(options = {}) {
  const defaultOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-features=IsolateOrigins,site-per-process',
      '--blink-settings=imagesEnabled=true'
    ],
    ignoreHTTPSErrors: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    executablePath: executablePath()
  };

  // Merge default options with any provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  return await puppeteer.launch(mergedOptions);
}

/**
 * Configure a page with additional anti-detection measures
 * 
 * @param {Page} page - Puppeteer page to configure
 */
async function setupStealthPage(page) {
  // Set a realistic user agent if not already set
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
  await page.setUserAgent(userAgent);
  
  // Set extra HTTP headers that real browsers typically include
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
  });

  // Override permissions
  const context = page.browserContext();
  await context.overridePermissions('https://*.com', ['geolocation', 'notifications']);
  
  // Emulate modern hardware concurrency for more realistic navigator properties
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    
    // Add language settings that a real browser would have
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    
    // Make navigator.plugins and navigator.mimeTypes non-empty
    const makePlugins = () => {
      const plugins = [1, 2, 3, 4, 5];
      plugins.__proto__ = Plugin.prototype;
      return plugins;
    };
    
    // Remove automation flags
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    
    // Mock browser plugins
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery(parameters);
    };
    
    // Add Chrome runtime that anti-bot systems check for
    if (!window.chrome) {
      window.chrome = {};
      window.chrome.runtime = {};
    }
  });
}

module.exports = {
  launchStealthBrowser,
  setupStealthPage
};
