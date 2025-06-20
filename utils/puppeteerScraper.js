/**
 * Puppeteer-based scraper helper
 * 
 * Uses a headless Chrome browser to handle JavaScript-heavy sites
 * and bypass anti-scraping measures.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Cache for browser instance
let browserInstance = null;

/**
 * Get a browser instance (creating one if needed)
 * @param {Object} options - Browser launch options
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
async function getBrowser(options = {}) {
  if (browserInstance) {
    try {
      // Check if the browser is still open
      await browserInstance.version();
      return browserInstance;
    } catch (error) {
      // Browser is closed or crashed, create a new one
      browserInstance = null;
    }
  }

  const defaultOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
    ignoreHTTPSErrors: true,
    executablePath: executablePath()
  };

  const browserOptions = { ...defaultOptions, ...options };
  browserInstance = await puppeteer.launch(browserOptions);
  return browserInstance;
}

/**
 * Scrape a website using Puppeteer
 * @param {String} url - URL to scrape
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} Page content and other data
 */
async function scrapeWithPuppeteer(url, options = {}) {
  const logger = options.logger || console;
  const browser = await getBrowser(options.browserOptions);
  let page = null;

  try {
    logger.info(`Opening page: ${url}`);
    page = await browser.newPage();

    // Set viewport size
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // Set user agent
    if (options.userAgent) {
      await page.setUserAgent(options.userAgent);
    } else {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );
    }

    // Set extra headers
    if (options.headers) {
      await page.setExtraHTTPHeaders(options.headers);
    }

    // Wait options
    const timeout = options.timeout || 30000;
    const waitUntil = options.waitUntil || 'networkidle2';

    // Navigate to the page
    logger.info(`Navigating to ${url} with ${timeout}ms timeout`);
    const response = await page.goto(url, { waitUntil, timeout });

    // Optional delay to allow JavaScript to execute
    if (options.delay) {
      logger.info(`Waiting ${options.delay}ms for JavaScript execution`);
      await page.waitForTimeout(options.delay);
    }

    // Wait for specific selector if provided
    if (options.waitForSelector) {
      logger.info(`Waiting for selector: ${options.waitForSelector}`);
      await page.waitForSelector(options.waitForSelector, { 
        timeout,
        visible: true 
      }).catch(e => {
        logger.warn(`Selector not found: ${options.waitForSelector}`, e.message);
      });
    }

    // Scroll to load lazy content if needed
    if (options.scrollToBottom) {
      logger.info('Scrolling to bottom of page to load lazy content');
      await autoScroll(page);
    }

    // Get page content
    const content = await page.content();

    // Take screenshot if debug mode is on
    if (options.debug) {
      const screenshotDir = path.join(os.tmpdir(), 'discovr-scrapers');
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
      }
      const screenshotPath = path.join(
        screenshotDir,
        `${new URL(url).hostname}-${Date.now()}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      logger.info(`Screenshot saved: ${screenshotPath}`);
    }

    // Call custom evaluator function if provided
    let evaluatorResult = null;
    if (options.evaluator && typeof options.evaluator === 'function') {
      logger.info('Running custom page evaluator');
      evaluatorResult = await page.evaluate(options.evaluator);
    }

    // Get cookies if requested
    let cookies = null;
    if (options.getCookies) {
      cookies = await page.cookies();
    }

    return {
      content,
      url: page.url(), // in case of redirects
      status: response ? response.status() : null,
      cookies,
      evaluatorResult,
    };
  } catch (error) {
    logger.error(`Error scraping ${url}: ${error.message}`);
    if (page) {
      // Try to take an error screenshot in debug mode
      if (options.debug) {
        try {
          const screenshotDir = path.join(os.tmpdir(), 'discovr-scrapers');
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }
          const screenshotPath = path.join(
            screenshotDir,
            `${new URL(url).hostname}-error-${Date.now()}.png`
          );
          await page.screenshot({ path: screenshotPath, fullPage: true });
          logger.info(`Error screenshot saved: ${screenshotPath}`);
        } catch (screenshotError) {
          logger.error('Failed to take error screenshot', screenshotError.message);
        }
      }
    }
    throw error;
  } finally {
    // Close the page but keep the browser open for reuse
    if (page) {
      await page.close();
    }
  }
}

/**
 * Helper function to scroll down the page
 * @param {Page} page - Puppeteer page
 * @returns {Promise<void>}
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Clean up resources by closing the browser
 * @returns {Promise<void>}
 */
async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Close browser on process exit
process.on('exit', async () => {
  await closeBrowser();
});

module.exports = {
  scrapeWithPuppeteer,
  getBrowser,
  closeBrowser
};
