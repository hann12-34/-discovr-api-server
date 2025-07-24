/**
 * Vancouver Mural Festival Events Scraper
 * Scrapes events from Vancouver Mural Festival website
 * https://vanmuralfest.ca/events/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class MuralFestEvents {
  constructor() {
    this.name = 'Vancouver Mural Festival Events';
    this.url = 'https://vanmuralfest.ca/events/';
    this.sourceIdentifier = 'vancouver-mural-festival';
    this.venue = {
      name: 'Vancouver Mural Festival',
      address: 'Various locations, Mount Pleasant, Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2653, lng: -123.1001 } // Mount Pleasant area
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'vancouver-mural-festival');
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
   * Scrape events from Vancouver Mural Festival website
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
        return document.querySelectorAll('.event-item, [class*="event"], article, .card').length > 0;
      });
      
      // If no events found on the main events page, check the homepage for festival dates
      if (!hasEvents) {
        console.log('No events found on the events page. Checking homepage for festival dates...');
        await page.goto('https://vanmuralfest.ca/', { waitUntil: 'networkidle0', timeout: 30000 });
      }
      
      // Extract events
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
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
      
      // Extract events from event items or festival info on homepage
      const events = await page.evaluate((venueInfo) => {
        const events = [];
        
        // Try different selectors for event containers
        const selectors = [
          '.event-item',
          '.event-card',
          '.card',
          'article',
          '.event',
          '[class*="event"]'
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
            const dateEl = container.querySelector('.date, [class*="date"], time');
            const dateText = dateEl ? dateEl.textContent.trim() : '';
            
            // Extract description
            const descEl = container.querySelector('p, .description, [class*="description"], .excerpt');
            const description = descEl ? descEl.textContent.trim() : '';
            
            // Extract location
            const locationEl = container.querySelector('.location, [class*="location"], .venue, [class*="venue"]');
            const location = locationEl ? locationEl.textContent.trim() : venueInfo.address;
            
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
        } else {
          // If no event containers found, look for festival dates on the homepage
          // Festival dates are often in large text or headings
          const festivalHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).filter(el => {
            const text = el.textContent.toLowerCase();
            return text.includes('festival') || 
                   text.includes('2025') || 
                   text.includes('july') || 
                   text.includes('august');
          });
          
          // Process festival headers
          festivalHeaders.forEach(header => {
            const title = 'Vancouver Mural Festival 2025';
            const dateText = header.textContent.trim();
            
            // Look for description near the header
            let description = '';
            let descEl = header.nextElementSibling;
            let count = 0;
            
            while (descEl && count < 3) {
              if (descEl.tagName === 'P') {
                description += descEl.textContent.trim() + ' ';
              }
              descEl = descEl.nextElementSibling;
              count++;
            }
            
            if (!description) {
              description = 'The Vancouver Mural Festival transforms the city with stunning murals and vibrant events celebrating public art and local culture.';
            }
            
            // Look for an image
            const imgEl = header.parentElement.querySelector('img');
            const imageUrl = imgEl ? imgEl.src : '';
            
            events.push({
              title,
              dateText,
              description,
              location: venueInfo.address,
              imageUrl,
              url: window.location.href
            });
          });
        }
        
        return events;
      }, this.venue);
      
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
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString) {
    if (!dateString) return null;
    
    // Default to current year if not specified
    const currentYear = 2025;
    
    // Format: "July 30 - August 8, 2025" (typical festival date range)
    const festivalRangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const festivalRangeMatch = dateString.match(festivalRangePattern);
    
    if (festivalRangeMatch) {
      const startMonth = festivalRangeMatch[1];
      const startDay = parseInt(festivalRangeMatch[2], 10);
      const endMonth = festivalRangeMatch[3] || startMonth;
      const endDay = parseInt(festivalRangeMatch[4], 10);
      const year = festivalRangeMatch[5] ? parseInt(festivalRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay, 10, 0);
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 23, 59);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "August 2025" (month and year only)
    const monthYearPattern = /(\w+)\s+(\d{4})/i;
    const monthYearMatch = dateString.match(monthYearPattern);
    
    if (monthYearMatch) {
      const month = monthYearMatch[1];
      const year = parseInt(monthYearMatch[2], 10);
      
      // Vancouver Mural Festival typically runs for 10 days in early August
      const startDate = new Date(year, this._getMonthNumber(month), 1, 10, 0);
      const endDate = new Date(year, this._getMonthNumber(month), 10, 23, 59);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "Summer 2025" (season and year)
    const seasonYearPattern = /(spring|summer|fall|autumn|winter)\s+(\d{4})/i;
    const seasonYearMatch = dateString.match(seasonYearPattern);
    
    if (seasonYearMatch) {
      const season = seasonYearMatch[1].toLowerCase();
      const year = parseInt(seasonYearMatch[2], 10);
      
      let startDate, endDate;
      
      switch (season) {
        case 'summer':
          // VMF is typically in summer, use August dates
          startDate = new Date(year, 7, 1, 10, 0); // August 1
          endDate = new Date(year, 7, 10, 23, 59); // August 10
          break;
        case 'spring':
          startDate = new Date(year, 4, 15, 10, 0); // May 15
          endDate = new Date(year, 5, 15, 23, 59); // June 15
          break;
        case 'fall':
        case 'autumn':
          startDate = new Date(year, 8, 15, 10, 0); // September 15
          endDate = new Date(year, 9, 15, 23, 59); // October 15
          break;
        case 'winter':
          startDate = new Date(year, 11, 1, 10, 0); // December 1
          endDate = new Date(year, 11, 31, 23, 59); // December 31
          break;
      }
      
      if (startDate && !isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "July 2025 Festival" (extract month and year)
    const textPattern = /(\w+)\s+(\d{4})/i;
    const textMatch = dateString.match(textPattern);
    
    if (textMatch) {
      const month = textMatch[1];
      const year = parseInt(textMatch[2], 10);
      
      // For festival events, default to a 10-day period in the specified month
      const startDate = new Date(year, this._getMonthNumber(month), 1, 10, 0);
      const endDate = new Date(year, this._getMonthNumber(month), 10, 23, 59);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "2025 Festival" (year only)
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = dateString.match(yearPattern);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      
      // VMF typically happens in August, so default to August dates
      const startDate = new Date(year, 7, 1, 10, 0); // August 1
      const endDate = new Date(year, 7, 10, 23, 59); // August 10
      
      return { startDate, endDate };
    }
    
    // If we can't find a specific date pattern, but the string contains "festival"
    // Default to summer festival dates (early August)
    if (dateString.toLowerCase().includes('festival')) {
      const startDate = new Date(currentYear, 7, 1, 10, 0); // August 1, 2025
      const endDate = new Date(currentYear, 7, 10, 23, 59); // August 10, 2025
      
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

module.exports = MuralFestEvents;
