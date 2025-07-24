/**
 * Museum of Anthropology (MOA) Events Scraper
 * Scrapes events from the Museum of Anthropology at UBC
 * https://moa.ubc.ca/exhibitions-events/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class MOAEvents {
  constructor() {
    this.name = 'Museum of Anthropology at UBC Events';
    this.url = 'https://moa.ubc.ca/exhibitions-events/';
    this.sourceIdentifier = 'museum-of-anthropology-ubc';
    this.venue = {
      name: 'Museum of Anthropology at UBC',
      address: '6393 NW Marine Drive, Vancouver, BC V6T 1Z2',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2699, lng: -123.2588 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'moa-events');
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
   * Scrape events from MOA website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`Scraping ${this.name}...`);
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
          '--disable-blink-features=AutomationControlled'
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
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}...`);
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log(`📄 Navigated to ${this.url}`);
      
      // Check if there are events on the page
      const hasEvents = await page.evaluate(() => {
        return document.querySelectorAll('.event, .events, .event-item, article, .card, .program').length > 0;
      });
      
      // If no events found on the events page, check the exhibitions page
      if (!hasEvents) {
        console.log('No events found on the events page. Checking exhibitions page...');
        await page.goto('https://moa.ubc.ca/exhibitions/', { waitUntil: 'networkidle0', timeout: 30000 });
      }
      
      // Extract events
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
      // If no events found on exhibitions page, check calendar page
      if (events.length === 0) {
        console.log('No events found on exhibitions page. Checking calendar page...');
        await page.goto('https://moa.ubc.ca/calendar/', { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Extract events from calendar page
        const calendarEvents = await this._extractEvents(page);
        events.push(...calendarEvents);
      }
      
      // Validate and filter events
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
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Extract events from the page
      const events = await page.evaluate((venue) => {
        const events = [];
        const today = new Date();
        
        // Define possible selectors for event containers based on common patterns
        // and MOA's specific website structure
        const selectors = [
          '.event-listing article', 
          '.event-item',
          '.exhibition-item',
          '.event',
          '.card',
          '.program-item',
          'article',
          '.calendar-event'
        ];
        
        // Try each selector to find event containers
        let eventContainers = [];
        for (const selector of selectors) {
          const containers = document.querySelectorAll(selector);
          if (containers.length > 0) {
            eventContainers = Array.from(containers);
            break;
          }
        }
        
        // Process each event container
        if (eventContainers.length > 0) {
          eventContainers.forEach(container => {
            // Extract title
            const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"]');
            const title = titleEl ? titleEl.textContent.trim() : '';
            
            // Extract date
            const dateEl = container.querySelector('.date, [class*="date"], .time, [class*="time"], time');
            const dateText = dateEl ? dateEl.textContent.trim() : '';
            
            // Extract description
            const descEl = container.querySelector('p, .description, [class*="description"], .excerpt, .content');
            const description = descEl ? descEl.textContent.trim() : '';
            
            // Extract location
            const locationEl = container.querySelector('.location, [class*="location"], .venue, [class*="venue"]');
            const location = locationEl ? locationEl.textContent.trim() : venue.address;
            
            // Extract image
            const imgEl = container.querySelector('img');
            const imageUrl = imgEl ? imgEl.src : '';
            
            // Extract URL
            const linkEl = container.querySelector('a');
            const url = linkEl ? linkEl.href : window.location.href;
            
            // Only add events with sufficient information
            if (title && (dateText || description)) {
              events.push({
                title,
                dateText,
                description: description || title,
                location,
                imageUrl,
                url
              });
            }
          });
        }
        
        // If no events found through containers, look for exhibitions
        if (events.length === 0) {
          // Look for exhibition-related headers or sections
          const exhibitionHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).filter(h => {
            const text = h.textContent.toLowerCase();
            return text.includes('exhibition') || 
                   text.includes('current') || 
                   text.includes('upcoming') ||
                   text.includes('on view') ||
                   text.includes('gallery');
          });
          
          exhibitionHeaders.forEach(header => {
            // Look for the exhibition title, date, and description in the nearby content
            const title = header.textContent.trim();
            let dateText = '';
            let description = '';
            let imageUrl = '';
            let url = window.location.href;
            
            // Check parent for date information
            let parent = header.parentElement;
            const dateElements = parent.querySelectorAll('.date, [class*="date"], time, .meta');
            if (dateElements.length > 0) {
              dateText = dateElements[0].textContent.trim();
            }
            
            // Check for description in siblings
            let sibling = header.nextElementSibling;
            while (sibling && !description) {
              if (sibling.tagName === 'P') {
                description = sibling.textContent.trim();
              }
              sibling = sibling.nextElementSibling;
            }
            
            // Look for image in the parent container
            const imgEl = parent.querySelector('img');
            if (imgEl) {
              imageUrl = imgEl.src;
            }
            
            // Look for link in the parent container
            const linkEl = parent.querySelector('a');
            if (linkEl) {
              url = linkEl.href;
            }
            
            if (title && (dateText || description)) {
              events.push({
                title,
                dateText,
                description: description || title,
                location: venue.address,
                imageUrl,
                url
              });
            }
          });
        }
        
        return events;
      }, this.venue);
      
      // Process events and parse dates
      const processedEvents = [];
      
      for (const event of events) {
        // Parse dates
        const dates = this._parseDatesFromString(event.dateText, page.url());
        
        // Skip events with invalid dates
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates from: "${event.dateText}" for event: ${event.title}`);
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
            address: event.location || this.venue.address
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
   * @param {string} currentUrl Current page URL to help determine if this is an exhibition
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString, currentUrl) {
    if (!dateString) return null;
    
    // Default to current year if not specified
    const currentYear = 2025;
    
    // Format: "January 1 - December 31, 2025" (typical exhibition date range)
    const exhibitionRangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const exhibitionRangeMatch = dateString.match(exhibitionRangePattern);
    
    if (exhibitionRangeMatch) {
      const startMonth = exhibitionRangeMatch[1];
      const startDay = parseInt(exhibitionRangeMatch[2], 10);
      const endMonth = exhibitionRangeMatch[3] || startMonth;
      const endDay = parseInt(exhibitionRangeMatch[4], 10);
      const year = exhibitionRangeMatch[5] ? parseInt(exhibitionRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay, 10, 0); // Museum typically opens at 10am
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 17, 0); // Museum typically closes at 5pm
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "January 1, 2025" (single date format)
    const singleDatePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const singleDateMatch = dateString.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = singleDateMatch[3] ? parseInt(singleDateMatch[3], 10) : currentYear;
      
      // For exhibitions, we assume it lasts for at least a month
      // For events, we assume it lasts for one day
      const startDate = new Date(year, this._getMonthNumber(month), day, 10, 0);
      
      let endDate;
      if (currentUrl && currentUrl.includes('exhibition')) {
        // If it's an exhibition, assume it lasts for 3 months
        endDate = new Date(year, this._getMonthNumber(month) + 3, day, 17, 0);
      } else {
        // For regular events, assume it lasts for one day
        endDate = new Date(year, this._getMonthNumber(month), day, 17, 0);
      }
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "From January 2025" (start date only)
    const startDatePattern = /(?:from|starting|opens|beginning)?\s*(\w+)\s+(\d{4})/i;
    const startDateMatch = dateString.match(startDatePattern);
    
    if (startDateMatch) {
      const month = startDateMatch[1];
      const year = parseInt(startDateMatch[2], 10);
      
      const startDate = new Date(year, this._getMonthNumber(month), 1, 10, 0);
      const endDate = new Date(year, this._getMonthNumber(month) + 3, 1, 17, 0);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "Opening June 15" (opening date with no year specified)
    const openingPattern = /(?:opening|starting|begins|launches)?\s*(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
    const openingMatch = dateString.match(openingPattern);
    
    if (openingMatch) {
      const month = openingMatch[1];
      const day = parseInt(openingMatch[2], 10);
      
      const startDate = new Date(currentYear, this._getMonthNumber(month), day, 10, 0);
      const endDate = new Date(currentYear, this._getMonthNumber(month) + 3, day, 17, 0);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "2025" (year only)
    const yearOnlyPattern = /\b(20\d{2})\b/;
    const yearOnlyMatch = dateString.match(yearOnlyPattern);
    
    if (yearOnlyMatch) {
      const year = parseInt(yearOnlyMatch[1], 10);
      
      // Default to first day of the current month
      const today = new Date();
      const startDate = new Date(year, today.getMonth(), 1, 10, 0);
      const endDate = new Date(year, today.getMonth() + 3, 0, 17, 0); // Last day of the month + 3
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // If the string contains "permanent" or "ongoing", create a long-running event
    if (dateString.toLowerCase().includes('permanent') || dateString.toLowerCase().includes('ongoing')) {
      const startDate = new Date(currentYear, 0, 1, 10, 0); // January 1st of the current year
      const endDate = new Date(currentYear + 1, 11, 31, 17, 0); // December 31st of the next year
      
      return { startDate, endDate };
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

module.exports = MOAEvents;
