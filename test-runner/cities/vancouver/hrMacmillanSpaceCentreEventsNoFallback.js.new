/**
 * Vancouver Maritime Museum Events Scraper (No-Fallback Version)
 * Scrapes events from Vancouver Maritime Museum website
 * Implements strict no-fallback policy with comprehensive error handling and debug info
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class VancouverMaritimeMuseumEvents {
  constructor() {
    this.name = 'Vancouver Maritime Museum Events';
    this.url = 'https://vanmaritime.com/events/';
    this.calendarUrl = 'https://vanmaritime.com/calendar/';
    this.exhibitionUrl = 'https://vanmaritime.com/exhibitions/';
    this.sourceIdentifier = 'vancouver-maritime-museum';
    this.venue = {
      name: 'Vancouver Maritime Museum',
      address: '1905 Ogden Ave, Vancouver, BC V6J 1A3',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2778, lng: -123.1472 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'maritime-museum');
    
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
   * Scrape events from Vancouver Maritime Museum
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
      
      // First check main events page
      console.log(`Navigating to main events page ${this.url}...`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take screenshot and save debug info
      await this._saveDebugInfo(page, 'events-page');
      
      // Extract events from main events page
      console.log('Extracting events from main events page...');
      const eventsPageEvents = await this._extractEvents(page);
      
      // Check the calendar page for additional events
      console.log(`Navigating to calendar page ${this.calendarUrl}...`);
      await page.goto(this.calendarUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take screenshot and save debug info
      await this._saveDebugInfo(page, 'calendar-page');
      
      // Extract events from calendar page
      console.log('Extracting events from calendar page...');
      const calendarEvents = await this._extractEvents(page);
      
      // Check exhibitions page
      console.log(`Navigating to exhibitions page ${this.exhibitionUrl}...`);
      await page.goto(this.exhibitionUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take screenshot and save debug info
      await this._saveDebugInfo(page, 'exhibitions-page');
      
      // Extract exhibitions as events
      console.log('Extracting exhibitions as events...');
      const exhibitionEvents = await this._extractEvents(page, true);
      
      // Combine events from all sources
      const allEvents = [...eventsPageEvents, ...calendarEvents, ...exhibitionEvents];
      
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
      
      console.log(`⚓ Successfully scraped ${validEvents.length} events from ${this.name}`);
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
   * @param {boolean} isExhibitionPage Whether the page is the exhibitions page
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page, isExhibitionPage = false) {
    try {
      // Extract events from the page
      const events = await page.evaluate((venueInfo, isExhibitionPage) => {
        const events = [];
        
        // Define possible selectors for events based on page type
        let selectors = [
          '.event-item, .event, .calendar-event',
          '.post, article, .content-block',
          '.event-listing, .event-calendar-item'
        ];
        
        if (isExhibitionPage) {
          // Add exhibition-specific selectors
          selectors = [
            '.exhibition, .exhibit', 
            '.exhibition-item, .exhibit-item',
            ...selectors
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
          const genericSelectors = [
            '.col-md-4, .card',
            '.content-block, .block',
            'section, article',
            '.grid-item',
            '.wp-block',
            '.tribe-events-calendar-list__event',
            '.tribe-common-g-row'
          ];
          
          for (const selector of genericSelectors) {
            const found = document.querySelectorAll(selector);
            if (found && found.length > 0) {
              containers = Array.from(found);
              break;
            }
          }
        }
        
        // Process each container
        containers.forEach(container => {
          // Extract title
          const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', '.title', '.event-title', '.name'];
          let title = '';
          
          for (const selector of titleSelectors) {
            const titleElement = container.querySelector(selector);
            if (titleElement && titleElement.textContent.trim()) {
              title = titleElement.textContent.trim();
              break;
            }
          }
          
          // Skip if no title found
          if (!title) return;
          
          // Extract date
          const dateSelectors = ['.date', '.event-date', 'time', '.datetime', '.calendar-date'];
          let dateText = '';
          
          for (const selector of dateSelectors) {
            const dateElement = container.querySelector(selector);
            if (dateElement) {
              if (dateElement.getAttribute('datetime')) {
                dateText = dateElement.getAttribute('datetime');
                break;
              } else if (dateElement.textContent.trim()) {
                dateText = dateElement.textContent.trim();
                break;
              }
            }
          }
          
          // Extract time if separate from date
          const timeSelectors = ['.time', '.event-time'];
          let timeText = '';
          
          for (const selector of timeSelectors) {
            const timeElement = container.querySelector(selector);
            if (timeElement && timeElement.textContent.trim()) {
              timeText = timeElement.textContent.trim();
              break;
            }
          }
          
          // Combine date and time if separate
          if (timeText && !dateText.includes(timeText)) {
            dateText = `${dateText} ${timeText}`;
          }
          
          // Extract description
          const descSelectors = ['.description', '.event-description', '.summary', '.excerpt', '.content', 'p'];
          let description = '';
          
          for (const selector of descSelectors) {
            const descElements = container.querySelectorAll(selector);
            if (descElements && descElements.length > 0) {
              description = Array.from(descElements)
                .slice(0, 3)
                .map(el => el.textContent.trim())
                .filter(Boolean)
                .join(' ');
              if (description) break;
            }
          }
          
          // Extract image
          let imageUrl = '';
          const imgElement = container.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Extract link
          let url = '';
          const linkElement = container.querySelector('a');
          if (linkElement && linkElement.href) {
            url = linkElement.href;
          }
          
          // Only add events with sufficient information
          if (title && (dateText || description)) {
            events.push({
              title,
              dateText,
              description: description || title, // Use title as fallback description
              imageUrl,
              url,
              isExhibition: isExhibitionPage
            });
          }
        });
        
        return events;
      }, this.venue, isExhibitionPage);
      
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
          endDate: dates.endDate || dates.startDate,
          venue: this.venue,
          imageUrl: event.imageUrl,
          url: event.url || this.url,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-${slugify(event.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`,
          isExhibition: event.isExhibition
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
    
    // Format: "January 1 - December 31, 2025" or "Jan 1 - Dec 31, 2025" (date range)
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
    
    // Format: "January 1, 2025" or "Jan 1, 2025" (single date)
    const singleDatePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const singleDateMatch = dateString.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = singleDateMatch[3] ? parseInt(singleDateMatch[3], 10) : currentYear;
      
      // Look for time in the string
      let hours = 10; // Default to 10:00 AM for museum events
      let minutes = 0;
      
      const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
      const timeMatch = dateString.match(timePattern);
      
      if (timeMatch) {
        let parsedHours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2] || '0', 10);
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
      
      // Museum events typically last a few hours
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
    
    // Handle "Ongoing", "Daily", "Permanent" etc. for exhibitions
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
        
        const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
        const timeMatch = dateString.match(timePattern);
        
        if (timeMatch) {
          let parsedHours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2] || '0', 10);
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
    
    // Try ISO format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?)?$/)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const endDate = new Date(date);
        endDate.setHours(endDate.getHours() + 3); // Assume 3 hours for events
        return { startDate: date, endDate };
      }
    }
    
    // If no pattern matched, return null (strict no-fallback policy)
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
    
    return months[month.toLowerCase()] || null;
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

module.exports = new VancouverMaritimeMuseumEvents();
