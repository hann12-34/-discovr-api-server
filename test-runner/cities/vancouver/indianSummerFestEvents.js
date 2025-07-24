/**
 * Indian Summer Festival Events Scraper
 * Scrapes events from Indian Summer Festival website
 * https://indiansummerfest.ca/events/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class IndianSummerFestEvents {
  constructor() {
    this.name = 'Indian Summer Festival Events';
    this.url = 'https://indiansummerfest.ca/events/';
    this.sourceIdentifier = 'indian-summer-festival';
    this.venue = {
      name: 'Various Venues',
      address: 'Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2827, lng: -123.1207 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'indian-summer-fest');
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
   * Scrape events from Indian Summer Festival website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Indian Summer Festival Events...');
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
      console.log('Navigating to Indian Summer Festival events page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Indian Summer Festival events page');
      
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
      // Wait for event containers to load
      await page.waitForSelector('.event-entry, .tribe-events-list-event-wrap, article, .event-item, .events-list > div, [class*="event"]', {
        timeout: 30000
      }).catch(() => console.log('Timed out waiting for standard event selectors, will try alternative extraction method'));
      
      // Extract events
      const events = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors commonly used for events
        const eventSelectors = [
          '.event-entry', 
          '.tribe-events-list-event-wrap', 
          'article', 
          '.event-item',
          '.events-list > div',
          '.event-list-item',
          '.event',
          '.elementor-post',
          '.wp-block-post',
          '.post-item'
        ];
        
        // Find the first selector that works
        let containers = [];
        for (const selector of eventSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            containers = Array.from(elements);
            break;
          }
        }
        
        // If no predefined selectors work, look for event cards more generically
        if (containers.length === 0) {
          // Look for elements that might contain event info based on content
          const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i;
          
          // Find all elements with date patterns
          const elementsWithDates = [];
          
          // Find all elements that might be cards
          const potentialCards = document.querySelectorAll('.card, .box, .item, .col-md-6, .col-lg-4, .col-sm-6');
          potentialCards.forEach(card => {
            if (dateRegex.test(card.textContent)) {
              elementsWithDates.push(card);
            }
          });
          
          containers = elementsWithDates;
        }
        
        // Process containers to extract event details
        containers.forEach(container => {
          // Extract title
          const titleElement = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"], .event-title, .event-name');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // Extract date
          const dateElement = container.querySelector('.date, [class*="date"], time, .event-date, .event-time');
          let dateText = dateElement ? dateElement.textContent.trim() : '';
          
          // If no specific date element, look for date pattern in text
          if (!dateText) {
            const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i;
            const text = container.textContent;
            const match = text.match(dateRegex);
            if (match) {
              dateText = match[0];
            }
          }
          
          // Extract time
          const timeElement = container.querySelector('.time, [class*="time"]');
          const timeText = timeElement ? timeElement.textContent.trim() : '';
          
          // Extract description
          const descriptionElement = container.querySelector('p, .description, [class*="description"], .excerpt, [class*="excerpt"], .event-description, .summary');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Extract venue
          const venueElement = container.querySelector('.venue, [class*="venue"], .location, [class*="location"]');
          const venue = venueElement ? venueElement.textContent.trim() : '';
          
          // Extract image
          const imageElement = container.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : '';
          
          // Extract link
          const linkElement = container.querySelector('a');
          const url = linkElement ? linkElement.href : '';
          
          // Create event object if we have at least title and date/description
          if (title && (dateText || description)) {
            events.push({
              title,
              dateText: `${dateText} ${timeText}`.trim(),
              description: description || title, // Use title as fallback description
              venue,
              imageUrl,
              url
            });
          }
        });
        
        return events;
      });
      
      // Process events and parse dates
      const processedEvents = [];
      
      for (const event of events) {
        // Parse dates
        const dates = this._parseDatesFromString(event.dateText);
        
        // Skip events with invalid dates
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates from: "${event.dateText}" for event: ${event.title}`);
          continue;
        }
        
        // Process venue information
        let venue = { ...this.venue };
        if (event.venue) {
          venue.name = event.venue;
          venue.address = `${event.venue}, Vancouver, BC`;
        }
        
        // Create event object with parsed data
        const processedEvent = {
          title: event.title,
          description: event.description,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          imageUrl: event.imageUrl,
          url: event.url || this.url,
          venue: venue,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-${slugify(event.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`
        };
        
        processedEvents.push(processedEvent);
      }
      
      return processedEvents;
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
    
    // Default to current year if not specified
    const currentYear = new Date().getFullYear();
    
    // Format: "July 15th, 2025" or "July 15th"
    const monthDayPattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const monthDayMatch = dateString.match(monthDayPattern);
    
    if (monthDayMatch) {
      const month = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2], 10);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : currentYear;
      
      // Extract time if present
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
      const timeMatch = dateString.match(timePattern);
      
      let hours = 19; // Default to 7 PM for cultural events
      let minutes = 0;
      
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toLowerCase();
        
        if (period === 'pm' && hours < 12) {
          hours += 12;
        }
        if (period === 'am' && hours === 12) {
          hours = 0;
        }
      }
      
      const startDate = new Date(year, this._getMonthNumber(month), day, hours, minutes);
      
      // Set end date to 3 hours later
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "July 15-17, 2025" (date range)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangePattern);
    
    if (rangeMatch) {
      const month = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endDay = parseInt(rangeMatch[3], 10);
      const year = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(month), startDay);
      const endDate = new Date(year, this._getMonthNumber(month), endDay, 23, 59);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "15/07/2025" or "15/07/25" (numeric date)
    const numericPattern = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const numericMatch = dateString.match(numericPattern);
    
    if (numericMatch) {
      let day, month, year;
      
      // Assuming day/month/year format
      day = parseInt(numericMatch[1], 10);
      month = parseInt(numericMatch[2], 10) - 1; // JS months are 0-indexed
      year = parseInt(numericMatch[3], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      const startDate = new Date(year, month, day, 19, 0); // Default to 7 PM
      
      // Set end date to 3 hours later
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString}"`);
    return null;
  }
  
  /**
   * Helper function to convert month name to month number (0-11)
   * @param {string} month Month name
   * @returns {number} Month number (0-11)
   */
  _getMonthNumber(month) {
    const months = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };
    
    return months[month.toLowerCase()] || 0;
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
        title: await page.title()
      };
      
      fs.writeFileSync(
        path.join(sessionDir, 'debug_meta.json'),
        JSON.stringify(debugMeta, null, 2)
      );
      
      console.log(`📝 Debug info saved to ${sessionDir}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  }
}

module.exports = IndianSummerFestEvents;
