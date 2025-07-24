/**
 * Vancouver Boat Parties Events Scraper
 * Scrapes events from Vancouver Boat Parties website
 * https://www.vancouverboatparties.com/upcomingeventsvancouver
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class VancouverBoatPartiesEvents {
  constructor() {
    this.name = 'Vancouver Boat Parties Events';
    this.url = 'https://www.vancouverboatparties.com/upcomingeventsvancouver';
    this.sourceIdentifier = 'vancouver-boat-parties';
    this.venue = {
      name: 'Various Boats in Vancouver Harbor',
      address: 'Vancouver Harbor, Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2889, lng: -123.1131 } // Vancouver Harbor coordinates
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'vancouver-boat-parties');
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
   * Scrape events from Vancouver Boat Parties website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Vancouver Boat Parties Events...');
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
      console.log('Navigating to Vancouver Boat Parties events page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Vancouver Boat Parties events page');
      
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
      // Wait for event content to load
      await page.waitForSelector('.sqs-block-content', { timeout: 30000 });
      
      // Extract event details
      const eventCards = await page.evaluate(() => {
        // The site likely uses Squarespace, so look for event containers
        const eventContainers = Array.from(document.querySelectorAll('.sqs-block-content > div, .row-item, .summary-item, .eventlist-event'));
        
        return eventContainers.map(container => {
          // Extract title
          const titleElement = container.querySelector('h1, h2, h3, .summary-title, .eventlist-title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          // Extract description
          const descriptionElement = container.querySelector('p, .summary-excerpt, .eventlist-excerpt');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Extract date text - look for patterns that resemble dates
          const dateElement = container.querySelector('time, .date, .eventlist-meta-date, [class*="date"]');
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          
          // Try to find date in other text if no specific date element
          let extractedDateText = dateText;
          if (!extractedDateText) {
            const allText = container.textContent;
            const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|\d{1,2}(?:st|nd|rd|th)? (?:of )?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:,? \d{4})?|\d{1,2}(?:st|nd|rd|th)? (?:of )?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:,? \d{4})?/i;
            const match = allText.match(datePattern);
            if (match) {
              extractedDateText = match[0];
            }
          }
          
          // Extract time text
          const timeElement = container.querySelector('.time, .eventlist-meta-time, [class*="time"]');
          const timeText = timeElement ? timeElement.textContent.trim() : '';
          
          // Combine date and time
          const fullDateText = `${extractedDateText} ${timeText}`.trim();
          
          // Extract image URL
          const imageElement = container.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : '';
          
          // Extract ticket or detail URL
          const linkElement = container.querySelector('a[href*="event"], a[href*="tickets"], a.summary-title-link, a.eventlist-title-link, a');
          const url = linkElement ? linkElement.href : '';
          
          // Price information
          const priceElement = container.querySelector('.price, [class*="price"]');
          const price = priceElement ? priceElement.textContent.trim() : '';
          
          return {
            title,
            description,
            dateText: fullDateText,
            imageUrl,
            url,
            price
          };
        }).filter(event => event.title && (event.dateText || event.description)); // Basic filtering
      });
      
      // Process each event with strict validation
      const processedEvents = [];
      
      for (const eventCard of eventCards) {
        // Skip events without title or date information
        if (!eventCard.title || (!eventCard.dateText && !eventCard.description)) {
          console.log(`⚠️ Skipping event with insufficient data: ${eventCard.title || 'Unnamed'}`);
          continue;
        }
        
        // Parse dates
        const dates = this._parseDatesFromString(eventCard.dateText);
        
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates from: "${eventCard.dateText}" for event: ${eventCard.title}`);
          continue;
        }
        
        // Create full description with price if available
        let fullDescription = eventCard.description || '';
        if (eventCard.price) {
          fullDescription += `\n\nPrice: ${eventCard.price}`;
        }
        
        // Create event object
        const event = {
          title: eventCard.title,
          description: fullDescription,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          imageUrl: eventCard.imageUrl,
          url: eventCard.url || this.url,
          venue: this.venue,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-${slugify(eventCard.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`
        };
        
        processedEvents.push(event);
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
    
    // Default to current year if no year in date string
    const currentYear = new Date().getFullYear();
    let processedDateString = dateString;
    
    // Format: "July 15th, 2025" or "July 15th"
    const monthDayPattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const monthDayMatch = processedDateString.match(monthDayPattern);
    
    if (monthDayMatch) {
      const month = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2], 10);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : currentYear;
      
      // Extract time if present
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
      const timeMatch = processedDateString.match(timePattern);
      
      let hours = 19; // Default to 7 PM if no time specified
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
      
      const startDate = new Date(year, getMonthNumber(month), day, hours, minutes);
      
      // Set end date to 4 hours later (typical boat party duration)
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 4);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "July 15-17, 2025" (multi-day event)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = processedDateString.match(rangePattern);
    
    if (rangeMatch) {
      const month = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endDay = parseInt(rangeMatch[3], 10);
      const year = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : currentYear;
      
      const startDate = new Date(year, getMonthNumber(month), startDay, 19, 0); // 7 PM start
      const endDate = new Date(year, getMonthNumber(month), endDay, 23, 0); // 11 PM end
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString}"`);
    return null;
    
    // Helper function to convert month name to month number (0-11)
    function getMonthNumber(month) {
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

module.exports = VancouverBoatPartiesEvents;
