/**
 * Bloedel Conservatory Events Scraper
 * Scrapes events from the Bloedel Conservatory at Queen Elizabeth Park in Vancouver
 * https://vancouver.ca/parks-recreation-culture/bloedel-conservatory.aspx
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class BloedelConservatoryEvents {
  constructor() {
    this.name = 'Bloedel Conservatory Events';
    this.url = 'https://vancouver.ca/parks-recreation-culture/bloedel-conservatory.aspx';
    this.eventsUrl = 'https://vancouver.ca/parks-recreation-culture/events-at-bloedel.aspx';
    this.sourceIdentifier = 'bloedel-conservatory';
    this.venue = {
      name: 'Bloedel Conservatory',
      address: 'Queen Elizabeth Park, 4600 Cambie St, Vancouver, BC V5Z 2Z1',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2417, lng: -123.1126 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'bloedel-conservatory');
    
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
   * Scrape events from the Bloedel Conservatory website
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
      
      // First check main page for featured events/exhibitions
      console.log(`Navigating to main page ${this.url}...`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Extract any events from main page
      console.log('Extracting events from main page...');
      let mainPageEvents = await this._extractEvents(page);
      
      // Now check the dedicated events page
      console.log(`Navigating to events page ${this.eventsUrl}...`);
      await page.goto(this.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Extract events from events page
      console.log('Extracting events from events page...');
      const eventsPageEvents = await this._extractEvents(page, true);
      
      // Combine events from both pages
      let allEvents = mainPageEvents.concat(eventsPageEvents);
      
      // Check the city's events calendar page for additional Bloedel events
      try {
        console.log('Checking Vancouver events calendar for additional Bloedel events...');
        await page.goto('https://vancouver.ca/parks-recreation-culture/calendar-of-events.aspx', { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        
        // Search for Bloedel events in the calendar
        const searchInput = await page.$('input[name="eventSearch"], #event-search, .search-box input');
        if (searchInput) {
          await searchInput.type('Bloedel');
          
          const searchButton = await page.$('button[type="submit"], .search-button, input[type="submit"]');
          if (searchButton) {
            await searchButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            
            // Extract Bloedel events from search results
            const calendarEvents = await this._extractCalendarEvents(page);
            allEvents = allEvents.concat(calendarEvents);
          }
        }
      } catch (calendarError) {
        console.error(`Error checking calendar: ${calendarError.message}`);
        await this._saveDebugInfo(page, 'calendar-error');
      }
      
      // Remove duplicates based on title and date
      const uniqueEvents = this._removeDuplicateEvents(allEvents);
      
      // Validate events - strict validation with no fallbacks
      const validEvents = uniqueEvents.filter(event => {
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
      
      console.log(`Found ${validEvents.length} valid events out of ${uniqueEvents.length} unique events`);
      
      if (validEvents.length === 0) {
        console.log('⚠️ No valid events found after filtering. Strict validation removed all events but NO fallbacks will be used.');
      }
      
      console.log(`🌿 Successfully scraped ${validEvents.length} events from ${this.name}`);
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
   * @param {boolean} isEventsPage Whether the page is the dedicated events page
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page, isEventsPage = false) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot for debugging
      await this._saveDebugInfo(page, isEventsPage ? 'events-page-screenshot' : 'main-page-screenshot');
      
      // Extract events from the page
      const events = await page.evaluate((venue, isEventsPage) => {
        const events = [];
        
        // Define possible selectors for events
        let selectors = [
          '.event-item, .event, .calendar-event',
          '.post, article, .content-block',
          '.wp-block-post, .featured-event',
          '.event-listing, .event-calendar-item',
          '.exhibition, .exhibit',
          // City of Vancouver website often uses these classes
          '.vancouver-event, .city-event',
          '.events-list li, .events-listing-item'
        ];
        
        // Additional selectors if on the dedicated events page
        if (isEventsPage) {
          selectors = selectors.concat([
            '.events-container .event',
            '.eventCalendar-wrapper .event',
            '.event-details-container'
          ]);
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
          // Look for content blocks that might contain event information
          containers = Array.from(document.querySelectorAll('.content-block, .block, section, article'));
          
          // Filter to only containers that might contain events
          containers = containers.filter(container => {
            const text = container.textContent.toLowerCase();
            return (
              text.includes('event') || 
              text.includes('exhibition') || 
              text.includes('display') || 
              text.includes('conservatory') || 
              text.includes('bloedel') ||
              (text.includes('date') && text.includes('time'))
            );
          });
        }
        
        // Process each container
        containers.forEach(container => {
          // Extract title
          const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"], [class*="header"], .summary');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Skip if no title found or if it's clearly not an event
          if (!title || title.toLowerCase().includes('page not found')) return;
          
          // Only include events related to Bloedel Conservatory
          if (!isEventsPage && !title.toLowerCase().includes('bloedel') && 
              !container.textContent.toLowerCase().includes('bloedel')) {
            return;
          }
          
          // Extract date
          const dateEl = container.querySelector('.date, [class*="date"], time, .datetime, .meta, .info, [class*="time"]');
          const dateText = dateEl ? dateEl.textContent.trim() : '';
          
          // Extract time
          const timeEl = container.querySelector('.time, [class*="time"]');
          const timeText = timeEl ? timeEl.textContent.trim() : '';
          
          // Combine date and time
          const fullDateText = dateText + (timeText && !dateText.includes(timeText) ? ' ' + timeText : '');
          
          // Extract description
          const descEls = container.querySelectorAll('p, .description, [class*="description"], .excerpt, .content, .summary');
          let description = '';
          
          if (descEls && descEls.length > 0) {
            // Combine paragraphs if available
            const paragraphs = Array.from(descEls).slice(0, 3);
            description = paragraphs.map(p => p.textContent.trim()).join(' ');
          }
          
          // Extract image
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';
          
          // Extract URL
          const linkEl = container.querySelector('a');
          const url = linkEl ? linkEl.href : window.location.href;
          
          // Only add events with sufficient information
          if (title && (fullDateText || description)) {
            events.push({
              title,
              dateText: fullDateText,
              description: description || title,
              imageUrl,
              url
            });
          }
        });
        
        return events;
      }, this.venue, isEventsPage);
      
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
   * Extract events from the Vancouver events calendar
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractCalendarEvents(page) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot for debugging
      await this._saveDebugInfo(page, 'calendar-page-screenshot');
      
      // Extract events from the calendar page
      const events = await page.evaluate((venue) => {
        const events = [];
        
        // Define selectors for calendar events
        const selectors = [
          '.event-item, .event-calendar-item',
          '.event-listing, .event',
          'tr.vevent, .calendar-event'
        ];
        
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
          containers = Array.from(document.querySelectorAll('.content-block, .block, section, article, tr, li'));
          
          // Filter to only containers that might be events related to Bloedel
          containers = containers.filter(container => {
            const text = container.textContent.toLowerCase();
            return text.includes('bloedel') || text.includes('conservatory');
          });
        }
        
        // Process each container
        containers.forEach(container => {
          // Skip if not related to Bloedel
          if (!container.textContent.toLowerCase().includes('bloedel') && 
              !container.textContent.toLowerCase().includes('conservatory')) {
            return;
          }
          
          // Extract title
          const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"], .summary, a');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Skip if no title found
          if (!title) return;
          
          // Extract date
          const dateEl = container.querySelector('.date, [class*="date"], time, .datetime, .dtstart, [class*="time"]');
          const dateText = dateEl ? dateEl.textContent.trim() : '';
          
          // Extract time
          const timeEl = container.querySelector('.time, [class*="time"]');
          const timeText = timeEl ? timeEl.textContent.trim() : '';
          
          // Combine date and time
          const fullDateText = dateText + (timeText && !dateText.includes(timeText) ? ' ' + timeText : '');
          
          // Extract description
          const descEl = container.querySelector('p, .description, [class*="description"], .excerpt');
          const description = descEl ? descEl.textContent.trim() : '';
          
          // Extract URL
          const linkEl = container.querySelector('a');
          const url = linkEl ? linkEl.href : window.location.href;
          
          // Only add events with sufficient information
          if (title && (fullDateText || description)) {
            events.push({
              title,
              dateText: fullDateText,
              description: description || title,
              imageUrl: '',
              url
            });
          }
        });
        
        return events;
      }, this.venue);
      
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
          venue: this.venue,
          imageUrl: event.imageUrl,
          url: event.url || this.eventsUrl,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-calendar-${slugify(event.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`
        };
        
        processedEvents.push(processedEvent);
      }
      
      return processedEvents;
    } catch (error) {
      console.error(`Error extracting calendar events: ${error.message}`);
      await this._saveDebugInfo(page, 'calendar-extraction-error');
      return [];
    }
  }
  
  /**
   * Remove duplicate events based on title and date
   * @param {Array} events Array of events
   * @returns {Array} Array of unique events
   */
  _removeDuplicateEvents(events) {
    const uniqueEvents = [];
    const seenEvents = new Set();
    
    for (const event of events) {
      const eventKey = `${event.title}-${event.startDate ? event.startDate.toISOString() : ''}`;
      if (!seenEvents.has(eventKey)) {
        seenEvents.add(eventKey);
        uniqueEvents.push(event);
      }
    }
    
    return uniqueEvents;
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
    
    // Format: "January 1 - December 31, 2025" (date range)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-\–]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
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
      let hours = 10; // Default to 10:00 AM for conservatory events
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
      
      // Conservatory events typically last a few hours
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 3);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "July 2025" (month and year only)
    const monthYearPattern = /(\w+)\s+(\d{4})/i;
    const monthYearMatch = dateString.match(monthYearPattern);
    
    if (monthYearMatch) {
      const month = monthYearMatch[1];
      const year = parseInt(monthYearMatch[2], 10);
      
      const startDate = new Date(year, this._getMonthNumber(month), 1); // First day of month
      const endDate = new Date(year, this._getMonthNumber(month) + 1, 0); // Last day of month
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Handle "Ongoing", "Daily", "Permanent" etc.
    if (dateString_lower.includes('ongoing') || 
        dateString_lower.includes('daily') || 
        dateString_lower.includes('permanent') ||
        dateString_lower.includes('every day')) {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 3); // Assume 3 months for ongoing exhibitions
      
      return { startDate, endDate };
    }
    
    // Handle days of the week
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (dateString_lower.includes(daysOfWeek[i])) {
        const now = new Date();
        const currentDay = now.getDay();
        const targetDay = i;
        
        // Calculate days until next occurrence of this day
        const daysUntil = (targetDay - currentDay + 7) % 7;
        
        const startDate = new Date(now);
        startDate.setDate(now.getDate() + daysUntil);
        
        // Extract time if available
        let hours = 10; // Default to 10:00 AM
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
        
        startDate.setHours(hours, minutes, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2); // Assume 2 hours for recurring events
        
        return { startDate, endDate };
      }
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

module.exports = BloedelConservatoryEvents;
