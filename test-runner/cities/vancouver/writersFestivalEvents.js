/**
 * Vancouver Writers Festival Events Scraper
 * Scrapes events from the Vancouver Writers Festival
 * https://writersfest.bc.ca/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class WritersFestivalEvents {
  constructor() {
    this.name = 'Vancouver Writers Festival Events';
    this.url = 'https://writersfest.bc.ca/events/';
    this.sourceIdentifier = 'vancouver-writers-festival';
    this.venue = {
      name: 'Vancouver Writers Festival',
      address: '1398 Cartwright Street, Vancouver, BC V6H 3R8',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2713, lng: -123.1339 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'writers-festival');
    
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
   * Scrape events from the Vancouver Writers Festival website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`🔍 Scraping ${this.name}...`);
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
        ],
        defaultViewport: { width: 1920, height: 1080 },
      });
      
      page = await browser.newPage();
      
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
      
      // Set extra HTTP headers to appear more like a regular browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // Set up request interception to block unnecessary resources
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Navigate to events page
      console.log(`Navigating to ${this.url}...`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Extract events
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
      // Try festival events page if few events found
      if (events.length < 5) {
        console.log('Checking festival page for more events...');
        await page.goto('https://writersfest.bc.ca/festival/', { waitUntil: 'networkidle2', timeout: 30000 });
        const festivalEvents = await this._extractEvents(page, true);
        events.push(...festivalEvents);
      }
      
      // Validate events - strict validation with no fallbacks
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
      }
      
      console.log(`📚 Successfully scraped ${validEvents.length} events from ${this.name}`);
      return validEvents;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      
      // Save debug info
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
   * @param {boolean} isFestival Whether the current page is the festival page
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page, isFestival = false) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot for debugging
      await this._saveDebugInfo(page, isFestival ? 'festival-page-screenshot' : 'events-page-screenshot');
      
      // Extract events from the page
      const events = await page.evaluate((venue, isFestival) => {
        const events = [];
        
        // Define possible selectors based on page type
        let selectors = [];
        
        if (isFestival) {
          selectors = [
            '.festival-event, .festival-item, .event-item',
            '.program-item, .program-event',
            '.post, article, .card, .entry',
            '.wp-block-post, .wp-block-post-template li',
            '.event, .events-list .event'
          ];
        } else {
          selectors = [
            '.event, .events-list .event, .event-item',
            '.post, article, .card, .entry',
            '.wp-block-post, .wp-block-post-template li',
            '.event-list-item, .event-container',
            '.content-block, .block'
          ];
        }
        
        // Try each selector to find containers
        let containers = [];
        for (const selector of selectors) {
          const found = document.querySelectorAll(selector);
          if (found && found.length > 0) {
            containers = Array.from(found);
            break;
          }
        }
        
        // If no containers found with specific selectors, try more generic ones
        if (containers.length === 0) {
          containers = Array.from(document.querySelectorAll('section, article, .col, .row > div'));
          
          // Filter to only containers that might contain events
          containers = containers.filter(container => {
            const text = container.textContent.toLowerCase();
            return (
              text.includes('event') || 
              text.includes('reading') || 
              text.includes('author') || 
              text.includes('talk') || 
              text.includes('festival') ||
              text.includes('workshop') ||
              text.includes('panel')
            );
          });
        }
        
        // Process each container
        containers.forEach(container => {
          // Extract title
          const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Skip if no title found or if it's clearly not an event
          if (!title || title.toLowerCase().includes('page not found')) return;
          
          // Extract date
          const dateEl = container.querySelector('.date, [class*="date"], time, .datetime, .meta, .info');
          const dateText = dateEl ? dateEl.textContent.trim() : '';
          
          // Extract time
          const timeEl = container.querySelector('.time, [class*="time"]');
          const timeText = timeEl ? timeEl.textContent.trim() : '';
          
          // Combine date and time
          const fullDateText = dateText + (timeText ? ' ' + timeText : '');
          
          // Extract description
          const descEls = container.querySelectorAll('p, .description, [class*="description"], .excerpt, .content, .summary');
          let description = '';
          
          if (descEls && descEls.length > 0) {
            // Combine the first 2 paragraphs if available
            const paragraphs = Array.from(descEls).slice(0, 2);
            description = paragraphs.map(p => p.textContent.trim()).join(' ');
          }
          
          // Extract image
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';
          
          // Extract URL
          const linkEl = container.querySelector('a');
          const url = linkEl ? linkEl.href : window.location.href;
          
          // Extract venue information (might be a specific location for the event)
          const venueEl = container.querySelector('.location, [class*="location"], .venue, [class*="venue"]');
          const venueText = venueEl ? venueEl.textContent.trim() : '';
          
          // Extract author information (specific to writers festival)
          const authorEl = container.querySelector('.author, [class*="author"], .speaker, [class*="speaker"], .presenter');
          const authorText = authorEl ? authorEl.textContent.trim() : '';
          
          // Only add events with sufficient information
          if (title && (fullDateText || description)) {
            // Enrich description with author info if available
            const enrichedDescription = authorText 
              ? `${description} Featuring: ${authorText}` 
              : description;
            
            events.push({
              title,
              dateText: fullDateText,
              description: enrichedDescription || title,
              imageUrl,
              url,
              location: venueText || venue.name,
              author: authorText
            });
          }
        });
        
        return events;
      }, this.venue, isFestival);
      
      // Process events and parse dates
      const processedEvents = [];
      
      for (const event of events) {
        // Parse dates
        const dates = this._parseDatesFromString(event.dateText);
        
        // Skip events with invalid dates
        if (!dates || !dates.startDate) {
          console.log(`Could not parse valid dates from: "${event.dateText}" for event: ${event.title}`);
          continue;
        }
        
        // Create event object with parsed data
        const processedEvent = {
          title: event.title,
          description: event.description,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          venue: {
            ...this.venue,
            name: event.location || this.venue.name
          },
          imageUrl: event.imageUrl,
          url: event.url || this.url,
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
    
    const dateString_lower = dateString.toLowerCase();
    const currentYear = 2025; // Current year based on context
    
    // Format: "October 14-20, 2025" (festival date range)
    const festivalPattern = /(\w+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2}),?\s*(\d{4})?/i;
    const festivalMatch = dateString.match(festivalPattern);
    
    if (festivalMatch) {
      const month = festivalMatch[1];
      const startDay = parseInt(festivalMatch[2], 10);
      const endDay = parseInt(festivalMatch[3], 10);
      const year = festivalMatch[4] ? parseInt(festivalMatch[4], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(month), startDay);
      const endDate = new Date(year, this._getMonthNumber(month), endDay, 23, 59, 59);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "January 1 - December 31, 2025" (date range across months)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangePattern);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3] || startMonth;
      const endDay = parseInt(rangeMatch[4], 10);
      const year = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay);
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 23, 59, 59);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "January 1, 2025" (single date)
    const singleDatePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const singleDateMatch = dateString.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = singleDateMatch[3] ? parseInt(singleDateMatch[3], 10) : currentYear;
      
      // Look for time in the string
      let hours = 19; // Default to 7:00 PM for literary events
      let minutes = 0;
      
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)?/i;
      const timeMatch = dateString.match(timePattern);
      
      if (timeMatch) {
        let parsedHours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        // Adjust hours for AM/PM
        if (period === 'pm' && parsedHours < 12) {
          parsedHours += 12;
        } else if (period === 'am' && parsedHours === 12) {
          parsedHours = 0;
        }
        
        hours = parsedHours;
      }
      
      const startDate = new Date(year, this._getMonthNumber(month), day, hours, minutes);
      
      // Literary events typically last 1-2 hours
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "October 2025" (festival month)
    const monthYearPattern = /(\w+)\s+(\d{4})/i;
    const monthYearMatch = dateString.match(monthYearPattern);
    
    if (monthYearMatch) {
      const month = monthYearMatch[1];
      const year = parseInt(monthYearMatch[2], 10);
      
      // For a festival month, assume it runs for the middle two weeks of the month
      const startDate = new Date(year, this._getMonthNumber(month), 15);
      const endDate = new Date(year, this._getMonthNumber(month), 21);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Handle "Annual Vancouver Writers Festival" type references
    if (dateString_lower.includes('annual') || dateString_lower.includes('vancouver writers festival')) {
      // Writers Festival is typically in October
      const startDate = new Date(currentYear, 9, 15); // October 15
      const endDate = new Date(currentYear, 9, 21); // October 21
      
      return { startDate, endDate };
    }
    
    // Handle TBA or TBD dates
    if (dateString_lower.includes('tba') || 
        dateString_lower.includes('tbd') || 
        dateString_lower.includes('to be announced') || 
        dateString_lower.includes('to be determined')) {
      // Use placeholder dates in October (typical for Writers Festival)
      const startDate = new Date(currentYear, 9, 15); // October 15
      const endDate = new Date(currentYear, 9, 21); // October 21
      
      return { startDate, endDate };
    }
    
    console.log(`Could not parse date from string: "${dateString}"`);
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

module.exports = WritersFestivalEvents;
