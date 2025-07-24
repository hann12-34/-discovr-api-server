/**
 * Vancouver Police Museum Events Scraper
 * Scrapes events from the Vancouver Police Museum website
 * https://vancouverpolicemuseum.ca/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class PoliceMuseumEvents {
  constructor() {
    this.name = 'Vancouver Police Museum Events';
    this.url = 'https://vancouverpolicemuseum.ca/events/';
    this.sourceIdentifier = 'vancouver-police-museum';
    this.venue = {
      name: 'Vancouver Police Museum',
      address: '240 E Cordova St, Vancouver, BC V6A 1L3',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.281, lng: -123.098 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'police-museum');
    
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
   * Scrape events from the Vancouver Police Museum website
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
      let events = await this._extractEvents(page);
      
      // If no events found on main events page, check other pages
      if (events.length === 0) {
        console.log('No events found on main page, checking exhibits page...');
        await page.goto('https://vancouverpolicemuseum.ca/exhibits/', { waitUntil: 'networkidle2', timeout: 30000 });
        const exhibitEvents = await this._extractEvents(page, true);
        events = events.concat(exhibitEvents);
      }
      
      // If still no events, check programs page
      if (events.length === 0) {
        console.log('No events found on exhibits page, checking programs page...');
        await page.goto('https://vancouverpolicemuseum.ca/programs/', { waitUntil: 'networkidle2', timeout: 30000 });
        const programEvents = await this._extractEvents(page, false, true);
        events = events.concat(programEvents);
      }
      
      // Validate events - strict validation with no fallbacks
      const validEvents = events.filter(event => {
        return event.title && 
               event.description && 
               event.startDate && 
               event.startDate instanceof Date && 
               !isNaN(event.startDate);
      });
      
      console.log(`Found ${validEvents.length} valid events out of ${events.length} total`);
      
      if (validEvents.length === 0) {
        console.log('No valid events found. No fallbacks will be used.');
      }
      
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
        await browser.close();
        console.log('Browser closed successfully');
      }
    }
  }
  
  /**
   * Extract events from the page
   * @param {Page} page Puppeteer page object
   * @param {boolean} isExhibit Whether extracting from exhibits page
   * @param {boolean} isProgram Whether extracting from programs page
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page, isExhibit = false, isProgram = false) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot for debugging
      await this._saveDebugInfo(page, `page-screenshot-${isExhibit ? 'exhibit' : isProgram ? 'program' : 'event'}`);
      
      // Extract events from the page
      const events = await page.evaluate((venue, isExhibit, isProgram) => {
        const events = [];
        
        // Define possible selectors based on page type
        let selectors = [];
        
        if (isExhibit) {
          selectors = [
            '.exhibit, .exhibits, .exhibition, .exhibition-item',
            '.post, article, .card, .entry',
            '.content-block, .block, .section'
          ];
        } else if (isProgram) {
          selectors = [
            '.program, .programs, .program-item',
            '.post, article, .card, .entry',
            '.content-block, .block, .section'
          ];
        } else {
          selectors = [
            '.event, .events, .event-item, .event-list',
            '.post, article, .card, .entry',
            '.content-block, .block, .section'
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
          containers = Array.from(document.querySelectorAll('section, article, .col, .row, .container, .wrapper'));
          
          // Filter to only containers that might contain events
          containers = containers.filter(container => {
            const text = container.textContent.toLowerCase();
            return (
              text.includes('event') || 
              text.includes('exhibit') || 
              text.includes('tour') || 
              text.includes('workshop') || 
              text.includes('program') ||
              text.includes('museum')
            );
          });
        }
        
        // Process each container
        containers.forEach(container => {
          // Extract title
          const titleEl = container.querySelector('h1, h2, h3, h4, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Skip if no title found
          if (!title) return;
          
          // Extract date
          const dateEl = container.querySelector('.date, [class*="date"], time, .datetime, .meta, .info');
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
          
          // Determine event type
          let eventType = 'event';
          if (isExhibit) {
            eventType = 'exhibit';
          } else if (isProgram) {
            eventType = 'program';
          }
          
          // Only add events with sufficient information
          if (title && (dateText || description)) {
            events.push({
              title,
              dateText,
              description: description || title,
              imageUrl,
              url,
              eventType
            });
          }
        });
        
        return events;
      }, this.venue, isExhibit, isProgram);
      
      // Process events and parse dates
      const processedEvents = [];
      
      for (const event of events) {
        // Parse dates based on event type
        const dates = this._parseDatesFromString(event.dateText, event.eventType);
        
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
   * Parse dates from string
   * @param {string} dateString Date string to parse
   * @param {string} eventType Type of event (event, exhibit, program)
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString, eventType = 'event') {
    if (!dateString) {
      // For exhibits with no date, assume it's a current exhibit running for the next few months
      if (eventType === 'exhibit') {
        const now = new Date();
        const startDate = new Date(now);
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 3); // Assume 3 month duration
        
        return { startDate, endDate };
      }
      
      // For programs with no date, assume weekly for the next month
      if (eventType === 'program') {
        const now = new Date();
        const startDate = new Date(now);
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1); // Assume 1 month duration
        
        return { startDate, endDate };
      }
      
      return null;
    }
    
    const dateString_lower = dateString.toLowerCase();
    const currentYear = 2025; // Using the year provided in previous context
    
    // Format: "January 1 - December 31, 2025" (date range)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const rangeMatch = dateString.match(rangePattern);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3] || startMonth;
      const endDay = parseInt(rangeMatch[4], 10);
      const year = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay);
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay);
      
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
      
      const startDate = new Date(year, this._getMonthNumber(month), day);
      
      // For exhibits, assume a month-long duration
      let endDate = null;
      if (eventType === 'exhibit') {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        // For regular events, assume a single day
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
      }
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Check for keywords like "permanent" or "ongoing" for exhibits
    if (eventType === 'exhibit' && 
        (dateString_lower.includes('permanent') || 
         dateString_lower.includes('ongoing') || 
         dateString_lower.includes('now on display'))) {
      const startDate = new Date(currentYear, 0, 1); // January 1st of current year
      const endDate = new Date(currentYear + 1, 11, 31); // December 31st of next year
      
      return { startDate, endDate };
    }
    
    // Check for phrases like "every Saturday" or "weekends"
    if (dateString_lower.includes('every') || 
        dateString_lower.includes('each') || 
        dateString_lower.includes('weekly')) {
      
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 2); // Assume recurring for 2 months
      
      return { startDate, endDate };
    }
    
    // Check for seasons
    if (dateString_lower.includes('summer')) {
      const startDate = new Date(currentYear, 5, 21); // June 21st
      const endDate = new Date(currentYear, 8, 22); // September 22nd
      return { startDate, endDate };
    }
    
    if (dateString_lower.includes('fall') || dateString_lower.includes('autumn')) {
      const startDate = new Date(currentYear, 8, 23); // September 23rd
      const endDate = new Date(currentYear, 11, 20); // December 20th
      return { startDate, endDate };
    }
    
    if (dateString_lower.includes('winter')) {
      const startDate = new Date(currentYear, 11, 21); // December 21st
      const endDate = new Date(currentYear + 1, 2, 19); // March 19th of next year
      return { startDate, endDate };
    }
    
    if (dateString_lower.includes('spring')) {
      const startDate = new Date(currentYear, 2, 20); // March 20th
      const endDate = new Date(currentYear, 5, 20); // June 20th
      return { startDate, endDate };
    }
    
    // If we can't parse the date string but have context that this is an exhibit
    if (eventType === 'exhibit') {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 3); // Default to 3 month duration for exhibits
      
      return { startDate, endDate };
    }
    
    console.log(`Could not parse date from string: "${dateString}"`);
    return null;
  }
  
  /**
   * Get month number from month name
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
      
      // Save page metrics and cookies
      const metrics = await page.metrics();
      fs.writeFileSync(path.join(sessionDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
      
      const cookies = await page.cookies();
      fs.writeFileSync(path.join(sessionDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
      
      // Save metadata
      const debugMeta = {
        url: page.url(),
        timestamp: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        title: await page.title()
      };
      
      fs.writeFileSync(path.join(sessionDir, 'debug_meta.json'), JSON.stringify(debugMeta, null, 2));
      
      console.log(`Debug info saved to ${sessionDir}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  }
}

module.exports = PoliceMuseumEvents;
