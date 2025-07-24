/**
 * Vancouver Lookout Events Scraper
 * Scrapes events from the Vancouver Lookout at Harbour Centre
 * https://vancouverlookout.com/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class VancouverLookoutEvents {
  constructor() {
    this.name = 'Vancouver Lookout Events';
    this.url = 'https://vancouverlookout.com/events/';
    this.sourceIdentifier = 'vancouver-lookout';
    this.venue = {
      name: 'Vancouver Lookout at Harbour Centre',
      address: '555 W Hastings St, Vancouver, BC V6B 4N6',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2846, lng: -123.1116 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'vancouver-lookout');
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
   * Scrape events from Vancouver Lookout website
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
        return document.querySelectorAll('.event, .events, .event-item, article, .card, [class*="event"]').length > 0;
      });
      
      // If no events found on the events page, check the homepage
      if (!hasEvents) {
        console.log('No events found on the events page. Checking homepage...');
        await page.goto('https://vancouverlookout.com/', { waitUntil: 'networkidle0', timeout: 30000 });
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
      
      // Extract events from the page
      const events = await page.evaluate((venue) => {
        const events = [];
        
        // Try different selectors for event containers
        const selectors = [
          '.event', 
          '.events-container .event',
          '.event-item',
          '[class*="event-item"]',
          '.card',
          'article',
          '.program',
          '.featured-event',
          '.lookout-event'
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
            const dateEl = container.querySelector('.date, [class*="date"], time, .datetime');
            const dateText = dateEl ? dateEl.textContent.trim() : '';
            
            // Extract description
            const descEl = container.querySelector('p, .description, [class*="description"], .excerpt, .content, .summary');
            const description = descEl ? descEl.textContent.trim() : '';
            
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
                imageUrl,
                url
              });
            }
          });
        }
        
        // If no events found, look for promotional elements or featured content
        if (events.length === 0) {
          // Look for special events or promotional sections
          const promotionalSections = Array.from(document.querySelectorAll('.promotion, .featured, .special, .highlight, [class*="special"], [class*="feature"]'));
          
          promotionalSections.forEach(section => {
            const title = section.querySelector('h1, h2, h3, h4, h5')?.textContent.trim() || 'Vancouver Lookout Special Event';
            const dateText = section.querySelector('.date, time, [class*="date"]')?.textContent.trim() || '';
            const description = section.querySelector('p')?.textContent.trim() || '';
            const imgEl = section.querySelector('img');
            const imageUrl = imgEl ? imgEl.src : '';
            const linkEl = section.querySelector('a');
            const url = linkEl ? linkEl.href : window.location.href;
            
            if (title && (dateText || description)) {
              events.push({
                title,
                dateText,
                description: description || title,
                imageUrl,
                url
              });
            }
          });
        }
        
        // If still no events, look for seasonal offerings
        if (events.length === 0) {
          const seasonalElements = Array.from(document.querySelectorAll('section, .section, .container, .wrapper')).filter(el => {
            const text = el.textContent.toLowerCase();
            return text.includes('special') || 
                   text.includes('event') || 
                   text.includes('celebration') ||
                   text.includes('season') ||
                   text.includes('holiday') ||
                   text.includes('summer') ||
                   text.includes('winter');
          });
          
          seasonalElements.forEach(element => {
            const title = element.querySelector('h1, h2, h3, h4, h5')?.textContent.trim() || 'Vancouver Lookout Seasonal Event';
            const dateText = element.querySelector('.date, time, [class*="date"]')?.textContent.trim() || 'Summer 2025';
            
            // Extract several paragraphs for the description
            const paragraphs = Array.from(element.querySelectorAll('p')).slice(0, 3);
            const description = paragraphs.map(p => p.textContent.trim()).join(' ');
            
            // Extract image
            const imgEl = element.querySelector('img');
            const imageUrl = imgEl ? imgEl.src : '';
            
            // Extract URL
            const linkEl = element.querySelector('a');
            const url = linkEl ? linkEl.href : window.location.href;
            
            if (title && (dateText || description)) {
              events.push({
                title,
                dateText,
                description: description || title,
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
          venue: this.venue,
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
    
    // Format: "January 1 - December 31, 2025" (date range format)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangePattern);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3] || startMonth;
      const endDay = parseInt(rangeMatch[4], 10);
      const year = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay, 9, 0); // Vancouver Lookout typically opens at 9am
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 23, 0); // Closes at 11pm
      
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
      
      const startDate = new Date(year, this._getMonthNumber(month), day, 9, 0);
      const endDate = new Date(year, this._getMonthNumber(month), day, 23, 0);
      
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
          startDate = new Date(year, 5, 21, 9, 0); // June 21
          endDate = new Date(year, 8, 22, 23, 0); // September 22
          break;
        case 'spring':
          startDate = new Date(year, 2, 20, 9, 0); // March 20
          endDate = new Date(year, 5, 20, 23, 0); // June 20
          break;
        case 'fall':
        case 'autumn':
          startDate = new Date(year, 8, 23, 9, 0); // September 23
          endDate = new Date(year, 11, 20, 23, 0); // December 20
          break;
        case 'winter':
          startDate = new Date(year, 11, 21, 9, 0); // December 21
          endDate = new Date(year + 1, 2, 19, 23, 0); // March 19 of next year
          break;
      }
      
      if (startDate && !isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "2025" (year only)
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = dateString.match(yearPattern);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      
      // Current date in the specified year
      const now = new Date();
      const startDate = new Date(year, now.getMonth(), now.getDate(), 9, 0);
      const endDate = new Date(year, now.getMonth() + 3, now.getDate(), 23, 0); // 3 months duration
      
      return { startDate, endDate };
    }
    
    // Time pattern (e.g., "7:30 PM")
    const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm)/i;
    const timeMatch = dateString.match(timePattern);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3].toLowerCase();
      
      if (period === 'pm' && hours < 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }
      
      // Use current date + time
      const today = new Date();
      const startDate = new Date(currentYear, today.getMonth(), today.getDate(), hours, minutes);
      const endDate = new Date(currentYear, today.getMonth(), today.getDate(), hours + 2, minutes); // Assume 2 hours duration
      
      return { startDate, endDate };
    }
    
    // If the string contains "daily" or "everyday"
    if (dateString.toLowerCase().includes('daily') || dateString.toLowerCase().includes('everyday')) {
      // Use current date as start date
      const today = new Date();
      const startDate = new Date(currentYear, today.getMonth(), today.getDate(), 9, 0);
      const endDate = new Date(currentYear, today.getMonth() + 3, today.getDate(), 23, 0); // 3 months duration
      
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

module.exports = VancouverLookoutEvents;
