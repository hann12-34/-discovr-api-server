/**
 * Music on Main Events Scraper
 * Scrapes events from Music on Main website
 * https://www.musiconmain.ca/events/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class MusicOnMainEvents {
  constructor() {
    this.name = 'Music on Main Events';
    this.url = 'https://www.musiconmain.ca/events/';
    this.sourceIdentifier = 'music-on-main';
    this.venue = {
      name: 'Various Venues',
      address: 'Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2827, lng: -123.1207 } // Vancouver downtown coordinates
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'music-on-main');
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
   * Scrape events from Music on Main website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Music on Main Events...');
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
      console.log('Navigating to Music on Main events page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Music on Main events page');
      
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
      // Music on Main often uses event blocks or articles
      const eventContainers = [
        '.type-tribe_events', 
        '.event-entry', 
        '.event', 
        '.tribe-events-list-event-wrap',
        'article', 
        '.event-list > div',
        '.et_pb_post',
        '.elementor-post'
      ];
      
      // Try each selector to find event containers
      let eventSelector = null;
      for (const selector of eventContainers) {
        const count = await page.evaluate(sel => document.querySelectorAll(sel).length, selector);
        if (count > 0) {
          eventSelector = selector;
          console.log(`Found ${count} events using selector: ${selector}`);
          break;
        }
      }
      
      // If no predefined selector works, try to detect events differently
      if (!eventSelector) {
        console.log('No predefined event selector worked, trying alternative detection...');
        
        // Look for date patterns that might indicate events
        const hasEvents = await page.evaluate(() => {
          const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i;
          const text = document.body.textContent;
          return datePattern.test(text);
        });
        
        if (!hasEvents) {
          console.log('No date patterns found in the page, cannot reliably extract events');
          return [];
        }
      }
      
      // Extract events
      const events = await page.evaluate((selector) => {
        const events = [];
        
        // If we have a specific selector, use it to find event containers
        if (selector) {
          const containers = document.querySelectorAll(selector);
          
          containers.forEach(container => {
            // Find title element
            const titleElement = container.querySelector('h1, h2, h3, h4, h5, .summary, .title, [class*="title"]');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Find date element
            const dateElement = container.querySelector('.date, time, .datetime, [class*="date"], [class*="time"]');
            let dateText = dateElement ? dateElement.textContent.trim() : '';
            
            // If no specific date element found, look for date patterns in the text
            if (!dateText) {
              const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i;
              const text = container.textContent;
              const match = text.match(datePattern);
              if (match) {
                dateText = match[0];
              }
            }
            
            // Find description
            const descriptionElement = container.querySelector('p, .description, [class*="description"], .excerpt, [class*="excerpt"], .content, [class*="content"]');
            const description = descriptionElement ? descriptionElement.textContent.trim() : '';
            
            // Find venue/location information
            const venueElement = container.querySelector('.venue, .location, [class*="venue"], [class*="location"]');
            const venue = venueElement ? venueElement.textContent.trim() : '';
            
            // Find image
            const imageElement = container.querySelector('img');
            const imageUrl = imageElement ? imageElement.src : '';
            
            // Find link to event details
            const linkElement = container.querySelector('a[href*="event"], a.more-link, a.read-more, a:not([class])');
            const url = linkElement ? linkElement.href : '';
            
            // Find time information
            const timeElement = container.querySelector('.time, [class*="time"]');
            const timeText = timeElement ? timeElement.textContent.trim() : '';
            
            // Create event object
            if (title && (dateText || description)) {
              events.push({
                title,
                description: description || title, // Use title as description if none found
                dateText,
                timeText,
                venue,
                imageUrl,
                url
              });
            }
          });
        } else {
          // No specific selector worked, try to parse the whole page for events
          // This is less accurate but might catch some events
          
          // Look for headings that might be event titles
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5');
          
          headings.forEach(heading => {
            const title = heading.textContent.trim();
            if (!title) return;
            
            // Look for date pattern near this heading
            let dateText = '';
            let description = '';
            let venue = '';
            let imageUrl = '';
            let url = '';
            
            // Check if there's a date nearby (in siblings or parent)
            const datePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?/i;
            
            // Check in next siblings
            let nextSibling = heading.nextElementSibling;
            let siblingChecks = 0;
            
            while (nextSibling && siblingChecks < 5) {
              const siblingText = nextSibling.textContent.trim();
              
              // Check for date
              if (!dateText) {
                const dateMatch = siblingText.match(datePattern);
                if (dateMatch) {
                  dateText = dateMatch[0];
                }
              }
              
              // Check for description
              if (!description && nextSibling.tagName === 'P' && siblingText.length > 20) {
                description = siblingText;
              }
              
              // Check for venue
              if (!venue && siblingText.length < 100 && (
                siblingText.includes('Theatre') || 
                siblingText.includes('Hall') || 
                siblingText.includes('Centre') ||
                siblingText.includes('Center') ||
                siblingText.includes('Venue') ||
                siblingText.includes('Studio')
              )) {
                venue = siblingText;
              }
              
              // Check for image
              if (!imageUrl && nextSibling.querySelector('img')) {
                imageUrl = nextSibling.querySelector('img').src;
              }
              
              // Check for link
              if (!url && nextSibling.querySelector('a')) {
                url = nextSibling.querySelector('a').href;
              }
              
              nextSibling = nextSibling.nextElementSibling;
              siblingChecks++;
            }
            
            // Only add if we found at least a date or description
            if (title && (dateText || description)) {
              events.push({
                title,
                description,
                dateText,
                venue,
                imageUrl,
                url
              });
            }
          });
        }
        
        return events;
      }, eventSelector);
      
      // Process extracted events
      const processedEvents = [];
      
      for (const event of events) {
        // Skip if no title or no date/description
        if (!event.title || (!event.dateText && !event.description)) {
          console.log(`⚠️ Skipping event with insufficient data: ${event.title || 'Unnamed'}`);
          continue;
        }
        
        // Parse dates
        const dates = event.dateText ? this._parseDatesFromString(event.dateText, event.timeText) : null;
        
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates from: "${event.dateText}" for event: ${event.title}`);
          continue;
        }
        
        // Create venue object
        let venue = { ...this.venue };
        if (event.venue) {
          venue.name = event.venue;
        }
        
        // Create event object
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
   * @param {string} timeString Optional time string
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString, timeString = '') {
    if (!dateString) return null;
    
    // Default to current year if no year in date string
    const currentYear = new Date().getFullYear();
    const combinedString = `${dateString} ${timeString}`.trim();
    
    // Format: "July 15th, 2025" or "July 15th"
    const monthDayPattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const monthDayMatch = dateString.match(monthDayPattern);
    
    if (monthDayMatch) {
      const month = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2], 10);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : currentYear;
      
      // Extract time if present in combined string
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
      const timeMatch = combinedString.match(timePattern);
      
      let hours = 19; // Default to 7 PM for music events
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
      
      // Set end date to 2 hours later (typical concert duration)
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "July 15-17, 2025" (range)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangePattern);
    
    if (rangeMatch) {
      const month = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endDay = parseInt(rangeMatch[3], 10);
      const year = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(month), startDay, 19, 0);
      const endDate = new Date(year, this._getMonthNumber(month), endDay, 22, 0);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "15/07/2025" or "15/07/25" (day/month/year)
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
      
      // Extract time if present
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
      const timeMatch = combinedString.match(timePattern);
      
      let hours = 19; // Default to 7 PM
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
      
      const startDate = new Date(year, month, day, hours, minutes);
      
      // Set end date to 2 hours later
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString} ${timeString}"`);
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

module.exports = MusicOnMainEvents;
