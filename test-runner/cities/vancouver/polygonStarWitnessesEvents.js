/**
 * The Polygon Star Witnesses Exhibition Events Scraper
 * Scrapes events from The Polygon's Star Witnesses exhibition page
 * https://thepolygon.ca/exhibition/star-witnesses/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class PolygonStarWitnessesEvents {
  constructor() {
    this.name = 'The Polygon Star Witnesses Exhibition';
    this.url = 'https://thepolygon.ca/exhibition/star-witnesses/';
    this.sourceIdentifier = 'polygon-star-witnesses';
    this.venue = {
      name: 'The Polygon Gallery',
      address: '101 Carrie Cates Court, North Vancouver, BC V7M 3J4',
      city: 'North Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.3088, lng: -123.0826 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'polygon-star-witnesses');
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(this.debugDir)) {
      try {
        fs.mkdirSync(this.debugDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create debug directory: ${error.message}`);
      }
    }
  }

  /**
   * Scrape events from The Polygon Star Witnesses Exhibition page
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping The Polygon Star Witnesses Exhibition Events...');
    let browser = null;
    let page = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-blink-features=AutomationControlled',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      });
      
      page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
      
      // Set extra HTTP headers to appear more like a regular browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
    } catch (error) {
      console.error(`❌ Error launching browser: ${error.message}`);
      return [];
    }
    
    try {
      // Intercept requests to block unnecessary resources for better performance
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
    } catch (navigationError) {
      console.error(`Error setting up request interception: ${navigationError.message}`);
      throw navigationError; // Re-throw to be caught by the outer try-catch
    }
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Go to events page
      console.log('Navigating to Star Witnesses Exhibition page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Star Witnesses Exhibition page');
      
      // Extract events from the page
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
      // Filter out invalid events
      console.log('Filtering events...');
      const validEvents = events.filter(event => {
        const isValid = 
          event.title && 
          event.description && 
          event.startDate && 
          event.startDate instanceof Date && 
          !isNaN(event.startDate);
          
        if (!isValid) {
          console.log(`⚠️ Skipping invalid event: ${event.title || 'Unnamed'}`);
        }
        
        return isValid;
      });
      
      console.log(`Found ${validEvents.length} valid events out of ${events.length} total`);
      
      if (validEvents.length === 0) {
        console.log('⚠️ No valid events found after filtering. Strict validation removed all events but NO fallbacks will be used.');
        return [];
      }
      
      console.log(`🎉 Successfully scraped ${validEvents.length} events from ${this.name}`);
      return validEvents;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      
      // Save debug info for troubleshooting
      if (page) {
        try {
          await this._saveDebugInfo(page, 'error-scrape');
        } catch (debugError) {
          console.error(`Failed to save debug info: ${debugError.message}`);
        }
      }
      
      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed successfully');
        } catch (closeError) {
          console.error(`Failed to close browser: ${closeError.message}`);
        }
      }
    }
  }
  
  /**
   * Extract events from the page
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page) {
    try {
      // Wait for exhibition content to load
      await page.waitForSelector('.content-wrap', { timeout: 30000 });
      
      // Extract event details
      const eventData = await page.evaluate(() => {
        // Get the exhibition title
        const title = document.querySelector('h1')?.innerText.trim() || '';
        
        // Get the exhibition description
        const descriptionElements = Array.from(document.querySelectorAll('.content-wrap p'));
        const description = descriptionElements
          .map(p => p.innerText.trim())
          .filter(text => text.length > 0)
          .join('\n\n');
        
        // Get exhibition dates
        const dateText = document.querySelector('.exhibition-dates')?.innerText.trim() || 
                       Array.from(document.querySelectorAll('.content-wrap'))
                         .map(div => div.innerText)
                         .join(' ')
                         .match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*(?:–|-|to|until)\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/i)?.[0] || '';
        
        // Get exhibition image if available
        const imageUrl = document.querySelector('.wp-post-image')?.src || 
                        document.querySelector('img[src*="exhibition"]')?.src || '';
        
        return {
          title,
          description,
          dateText,
          imageUrl,
          url: window.location.href
        };
      });
      
      // No valid event data found
      if (!eventData.title || !eventData.description) {
        console.log('⚠️ No valid event data found on the page');
        await this._saveDebugInfo(page, 'no-event-data');
        return [];
      }
      
      // Parse dates
      const dates = this._parseDatesFromString(eventData.dateText);
      
      if (!dates || !dates.startDate) {
        console.log(`⚠️ Could not parse valid dates from: "${eventData.dateText}"`);
        return [];
      }
      
      // Create event object with strict validation
      const event = {
        title: eventData.title,
        description: eventData.description,
        startDate: dates.startDate,
        endDate: dates.endDate || null,
        imageUrl: eventData.imageUrl,
        url: this.url,
        venue: this.venue,
        sourceIdentifier: this.sourceIdentifier,
        uniqueId: `${this.sourceIdentifier}-${slugify(eventData.title, { lower: true, strict: true })}`
      };
      
      return [event];
    } catch (error) {
      console.error(`Error extracting events: ${error.message}`);
      await this._saveDebugInfo(page, 'extraction-error');
      return [];
    }
  }
  
  /**
   * Parse dates from string
   * @param {string} dateString Date string to parse
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString) {
    if (!dateString) return null;
    
    // Format: "January 26 – May 12, 2024"
    const rangePattern = /(\w+)\s+(\d{1,2})\s*(?:–|-|to|until)\s*(\w+)\s+(\d{1,2}),?\s*(\d{4})/i;
    const rangeMatch = dateString.match(rangePattern);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3];
      const endDay = parseInt(rangeMatch[4], 10);
      const year = parseInt(rangeMatch[5], 10);
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "January 2024 - May 2024"
    const monthYearRangePattern = /(\w+)\s+(\d{4})\s*(?:–|-|to|until)\s*(\w+)\s+(\d{4})/i;
    const monthYearRangeMatch = dateString.match(monthYearRangePattern);
    
    if (monthYearRangeMatch) {
      const startMonth = monthYearRangeMatch[1];
      const startYear = parseInt(monthYearRangeMatch[2], 10);
      const endMonth = monthYearRangeMatch[3];
      const endYear = parseInt(monthYearRangeMatch[4], 10);
      
      const startDate = new Date(`${startMonth} 1, ${startYear}`);
      const endDate = new Date(`${endMonth} 1, ${endYear}`);
      // Set to last day of end month
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "Until May 12, 2024" or "Ends May 12, 2024"
    const untilPattern = /(?:until|ends|through|on view through)\s+(\w+)\s+(\d{1,2}),?\s*(\d{4})/i;
    const untilMatch = dateString.match(untilPattern);
    
    if (untilMatch) {
      const month = untilMatch[1];
      const day = parseInt(untilMatch[2], 10);
      const year = parseInt(untilMatch[3], 10);
      
      const endDate = new Date(`${month} ${day}, ${year}`);
      const startDate = new Date(); // Today
      
      if (!isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "Opening January 26, 2024" or "Starting January 26, 2024"
    const startingPattern = /(?:opening|starting|begins|from)\s+(\w+)\s+(\d{1,2}),?\s*(\d{4})/i;
    const startingMatch = dateString.match(startingPattern);
    
    if (startingMatch) {
      const month = startingMatch[1];
      const day = parseInt(startingMatch[2], 10);
      const year = parseInt(startingMatch[3], 10);
      
      const startDate = new Date(`${month} ${day}, ${year}`);
      
      if (!isNaN(startDate.getTime())) {
        // Create end date 3 months from start date (typical exhibition duration)
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        
        return { startDate, endDate };
      }
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString}"`);
    return null;
  }
  
  /**
   * Save debug information
   * @param {Page} page Puppeteer page object
   * @param {string} prefix Prefix for debug files
   */
  async _saveDebugInfo(page, prefix) {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const debugPrefix = `${prefix}_${timestamp}`;
      
      // Create a directory for this debug session
      const sessionDir = path.join(this.debugDir, debugPrefix);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Save a screenshot
      await page.screenshot({
        path: path.join(sessionDir, 'screenshot.png'),
        fullPage: true
      });
      
      // Save the HTML content
      const html = await page.content();
      fs.writeFileSync(path.join(sessionDir, 'page.html'), html);
      
      // Save page metrics
      const metrics = await page.metrics();
      fs.writeFileSync(
        path.join(sessionDir, 'metrics.json'),
        JSON.stringify(metrics, null, 2)
      );
      
      // Save cookies
      const cookies = await page.cookies();
      fs.writeFileSync(
        path.join(sessionDir, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      
      // Save debugging metadata
      const debugMeta = {
        url: page.url(),
        timestamp: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight
        })),
        title: await page.title(),
        headers: await page.evaluate(() => {
          const headers = {};
          for (const pair of navigator.userAgentData?.brands || []) {
            headers[pair.brand] = pair.version;
          }
          return headers;
        })
      };
      
      fs.writeFileSync(
        path.join(sessionDir, 'debug_meta.json'),
        JSON.stringify(debugMeta, null, 2)
      );
      
      console.log(`📝 Debug info saved to ${sessionDir}`);
    } catch (error) {
      console.error(`Failed to save complete debug info: ${error.message}`);
    }
  }
}

module.exports = PolygonStarWitnessesEvents;
