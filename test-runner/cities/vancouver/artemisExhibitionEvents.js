/**
 * Science World Artemis Exhibition Events Scraper
 * Scrapes events from Science World's Artemis exhibition page
 * https://www.scienceworld.ca/exhibition/artemis/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class ArtemisExhibitionEvents {
  constructor() {
    this.name = 'Science World Artemis Exhibition Events';
    this.url = 'https://www.scienceworld.ca/exhibition/artemis/';
    this.sourceIdentifier = 'science-world-artemis';
    this.venue = {
      name: 'Science World',
      address: '1455 Quebec St, Vancouver, BC V6A 3Z7',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2735, lng: -123.1035 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'science-world-artemis');
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
   * Scrape events from Science World Artemis Exhibition page
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Science World Artemis Exhibition Events...');
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
      console.log('Navigating to Artemis Exhibition page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Artemis Exhibition page');
      
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
      // Wait for the exhibition content to load
      await page.waitForSelector('.exhibition-content', { timeout: 30000 });
      
      // Extract event details
      const eventData = await page.evaluate(() => {
        // Get the main exhibition title
        const title = document.querySelector('h1')?.innerText.trim() || '';
        
        // Get the exhibition description
        const descriptionElements = Array.from(document.querySelectorAll('.exhibition-content p'));
        const description = descriptionElements
          .map(p => p.innerText.trim())
          .filter(text => text.length > 0)
          .join('\n\n');
        
        // Get the exhibition dates
        const dateText = Array.from(document.querySelectorAll('.exhibition-meta'))
          .map(meta => meta.innerText)
          .join(' ')
          .match(/(?:From|Until|Dates:)\s*([\w\s,–-]+\d{4})/i)?.[1] || '';
          
        // Get the image if available
        const imageUrl = document.querySelector('.exhibition-image img')?.src || '';
        
        // Get the ticket URL
        const ticketLink = document.querySelector('a[href*="tickets"]')?.href || '';
        
        return {
          title,
          description,
          dateText,
          imageUrl,
          ticketLink
        };
      });
      
      // No valid event data found
      if (!eventData.title || !eventData.description) {
        console.log('⚠️ No valid event data found on the page');
        return [];
      }
      
      // Parse dates
      const dates = this._parseDatesFromString(eventData.dateText);
      
      if (!dates || !dates.startDate) {
        console.log(`⚠️ Could not parse valid dates from: "${eventData.dateText}"`);
        return [];
      }
      
      // Create event object
      const event = {
        title: eventData.title,
        description: eventData.description,
        startDate: dates.startDate,
        endDate: dates.endDate || null,
        imageUrl: eventData.imageUrl,
        url: this.url,
        ticketUrl: eventData.ticketLink || this.url,
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
    
    // Try various date formats
    
    // Format: "January 1 – December 31, 2025"
    const rangePattern = /(\w+)\s+(\d{1,2})\s*[–-]\s*(\w+)\s+(\d{1,2}),?\s*(\d{4})/i;
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
    
    // Format: "From May 2024" or "Until December 2025"
    const monthYearPattern = /(from|until)\s+(\w+)\s+(\d{4})/i;
    const monthYearMatch = dateString.match(monthYearPattern);
    
    if (monthYearMatch) {
      const type = monthYearMatch[1].toLowerCase();
      const month = monthYearMatch[2];
      const year = parseInt(monthYearMatch[3], 10);
      
      const date = new Date(`${month} 1, ${year}`);
      
      if (!isNaN(date.getTime())) {
        if (type === 'from') {
          return { startDate: date };
        } else {
          // For "until" type, set start date to today and end date to the specified date
          return { 
            startDate: new Date(), 
            endDate: date 
          };
        }
      }
    }
    
    // Format: "July 2025" (month and year only)
    const simpleMonthYearPattern = /(\w+)\s+(\d{4})/i;
    const simpleMonthYearMatch = dateString.match(simpleMonthYearPattern);
    
    if (simpleMonthYearMatch) {
      const month = simpleMonthYearMatch[1];
      const year = parseInt(simpleMonthYearMatch[2], 10);
      
      const startDate = new Date(`${month} 1, ${year}`);
      
      if (!isNaN(startDate.getTime())) {
        // Set end date to the last day of the month
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        
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
      
      // Save console logs
      const consoleLogPath = path.join(sessionDir, 'console.log');
      page.on('console', message => {
        fs.appendFileSync(consoleLogPath, `${message.type()}: ${message.text()}\n`);
      });
      
      // Save page errors
      const pageErrorPath = path.join(sessionDir, 'page_errors.log');
      page.on('pageerror', error => {
        fs.appendFileSync(pageErrorPath, `${error}\n`);
      });
      
      // Save network requests
      const requestsPath = path.join(sessionDir, 'requests.log');
      page.on('request', request => {
        fs.appendFileSync(requestsPath, `${request.method()} ${request.url()}\n`);
      });
      
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
      
      console.log(`📝 Debug info saved to ${sessionDir}`);
    } catch (error) {
      console.error(`Failed to save complete debug info: ${error.message}`);
    }
  }
}

module.exports = ArtemisExhibitionEvents;
