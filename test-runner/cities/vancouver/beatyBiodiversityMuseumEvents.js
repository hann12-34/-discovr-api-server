/**
 * Beaty Biodiversity Museum Events Scraper
 * Scrapes events from the Beaty Biodiversity Museum at UBC
 * https://beatymuseum.ubc.ca/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class BeatyBiodiversityMuseumEvents {
  constructor() {
    this.name = 'Beaty Biodiversity Museum Events';
    this.url = 'https://beatymuseum.ubc.ca/visit/events/';
    this.exhibitsUrl = 'https://beatymuseum.ubc.ca/visit/exhibitions/';
    this.sourceIdentifier = 'beaty-biodiversity-museum';
    this.venue = {
      name: 'Beaty Biodiversity Museum',
      address: '2212 Main Mall, Vancouver, BC V6T 1Z4',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2633, lng: -123.2510 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'beaty-biodiversity-museum');
    
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
   * Scrape events from the Beaty Biodiversity Museum website
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
      
      // If there are few events, also check the exhibitions page
      console.log(`Navigating to exhibitions page ${this.exhibitsUrl}...`);
      await page.goto(this.exhibitsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      const exhibitionEvents = await this._extractExhibitions(page);
      events = events.concat(exhibitionEvents);
      
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
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot for debugging
      await this._saveDebugInfo(page, 'events-page-screenshot');
      
      // Extract events from the page
      const events = await page.evaluate((venue) => {
        const events = [];
        
        // Define possible selectors for events
        const selectors = [
          '.event, .events-list .event, .event-item',
          '.post, article, .card, .entry',
          '.wp-block-post, .wp-block-post-template li',
          '.event-list-item, .event-container',
          '.content-block, .block',
          '.tribe-events-calendar-list__event' // The Events Calendar plugin
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
          containers = Array.from(document.querySelectorAll('section, article, .col, .row > div'));
          
          // Filter to only containers that might contain events
          containers = containers.filter(container => {
            const text = container.textContent.toLowerCase();
            return (
              text.includes('event') || 
              text.includes('workshop') || 
              text.includes('exhibit') || 
              text.includes('tour') || 
              (text.includes('date') && text.includes('time'))
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
          const dateEl = container.querySelector('.date, [class*="date"], time, .datetime, .meta, .info, .tribe-event-date-start');
          const dateText = dateEl ? dateEl.textContent.trim() : '';
          
          // Extract time
          const timeEl = container.querySelector('.time, [class*="time"]');
          const timeText = timeEl ? timeEl.textContent.trim() : '';
          
          // Combine date and time
          const fullDateText = dateText + (timeText ? ' ' + timeText : '');
          
          // Extract description
          const descEl = container.querySelector('p, .description, [class*="description"], .excerpt, .content, .summary');
          const description = descEl ? descEl.textContent.trim() : '';
          
          // Extract image
          const imgEl = container.querySelector('img');
          const imageUrl = imgEl ? imgEl.src : '';
          
          // Extract URL
          const linkEl = container.querySelector('a');
          const url = linkEl ? linkEl.href : window.location.href;
          
          // Extract location (might be specific room within the museum)
          const locationEl = container.querySelector('.location, [class*="location"], .venue, [class*="venue"]');
          const locationText = locationEl ? locationEl.textContent.trim() : '';
          
          // Only add events with sufficient information
          if (title && (fullDateText || description)) {
            events.push({
              title,
              dateText: fullDateText,
              description: description || title,
              imageUrl,
              url,
              location: locationText || venue.name
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
   * Extract exhibitions from the exhibitions page
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of exhibition objects
   */
  async _extractExhibitions(page) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Take screenshot for debugging
      await this._saveDebugInfo(page, 'exhibitions-page-screenshot');
      
      // Extract exhibitions from the page
      const exhibitions = await page.evaluate((venue) => {
        const exhibitions = [];
        
        // Define possible selectors for exhibitions
        const selectors = [
          '.exhibition, .exhibit, [class*="exhibition"], [class*="exhibit"]',
          'article, .post, .entry',
          '.wp-block-post, .wp-block-post-template li',
          '.content-block, .block, .section'
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
          containers = Array.from(document.querySelectorAll('section, article, .col, .row > div'));
          
          // Filter to only containers that might contain exhibitions
          containers = containers.filter(container => {
            const text = container.textContent.toLowerCase();
            return (
              text.includes('exhibit') || 
              text.includes('display') || 
              text.includes('gallery') || 
              text.includes('collection') || 
              text.includes('museum')
            );
          });
        }
        
        // Process each container
        containers.forEach(container => {
          // Extract title
          const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"]');
          const title = titleEl ? titleEl.textContent.trim() : '';
          
          // Skip if no title found
          if (!title) return;
          
          // Extract date
          const dateEl = container.querySelector('.date, [class*="date"], time, .datetime, .meta, .info');
          const dateText = dateEl ? dateEl.textContent.trim() : 'Current Exhibition';
          
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
          
          // Only add exhibitions with sufficient information
          if (title && (description || imageUrl)) {
            exhibitions.push({
              title,
              dateText: dateText || 'Permanent Exhibition',
              description: description || `${title} at the Beaty Biodiversity Museum.`,
              imageUrl,
              url,
              isExhibition: true
            });
          }
        });
        
        return exhibitions;
      }, this.venue);
      
      // Process exhibitions and parse dates
      const processedExhibitions = [];
      
      for (const exhibition of exhibitions) {
        // Parse dates - handle exhibitions differently, assuming longer durations
        const dates = this._parseDatesFromString(exhibition.dateText, true);
        
        // Skip exhibitions with invalid dates
        if (!dates || !dates.startDate) {
          console.log(`Could not parse valid dates from: "${exhibition.dateText}" for exhibition: ${exhibition.title}`);
          continue;
        }
        
        // Create exhibition object with parsed data
        const processedExhibition = {
          title: exhibition.title,
          description: exhibition.description,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          venue: this.venue,
          imageUrl: exhibition.imageUrl,
          url: exhibition.url || this.exhibitsUrl,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-exhibition-${slugify(exhibition.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`
        };
        
        processedExhibitions.push(processedExhibition);
      }
      
      return processedExhibitions;
    } catch (error) {
      console.error(`Error extracting exhibitions: ${error.message}`);
      await this._saveDebugInfo(page, 'exhibition-extraction-error');
      return [];
    }
  }
  
  /**
   * Parse dates from string
   * @param {string} dateString Date string to parse
   * @param {boolean} isExhibition Whether this is an exhibition (affects date parsing rules)
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString, isExhibition = false) {
    if (!dateString) {
      if (isExhibition) {
        // For exhibitions with no date, assume it's a current exhibition
        const now = new Date();
        const startDate = new Date(now);
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 6); // Assume 6 month duration for exhibitions
        
        return { startDate, endDate };
      }
      return null;
    }
    
    const dateString_lower = dateString.toLowerCase();
    const currentYear = 2025; // Current year based on context
    
    // Check for "permanent" or "ongoing" exhibitions
    if (isExhibition && 
        (dateString_lower.includes('permanent') || 
         dateString_lower.includes('ongoing') || 
         dateString_lower.includes('current'))) {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1); // Set end date to a year from now
      
      return { startDate, endDate };
    }
    
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
      
      // For exhibitions, assume a longer duration
      let endDate;
      if (isExhibition) {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3); // 3 months for exhibitions
      } else {
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59); // Same day for regular events
      }
      
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
    
    // Check for dates with times (e.g., "July 15, 2025 at 2:30pm")
    const dateTimePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?(?:.*?)(\d{1,2}):(\d{2})\s*(am|pm)?/i;
    const dateTimeMatch = dateString.match(dateTimePattern);
    
    if (dateTimeMatch) {
      const month = dateTimeMatch[1];
      const day = parseInt(dateTimeMatch[2], 10);
      const year = dateTimeMatch[3] ? parseInt(dateTimeMatch[3], 10) : currentYear;
      let hours = parseInt(dateTimeMatch[4], 10);
      const minutes = parseInt(dateTimeMatch[5], 10);
      const period = dateTimeMatch[6] ? dateTimeMatch[6].toLowerCase() : null;
      
      // Adjust hours for PM
      if (period === 'pm' && hours < 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }
      
      const startDate = new Date(year, this._getMonthNumber(month), day, hours, minutes);
      
      // End time is typically 1-2 hours after start for events
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 2);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Check for recurring events patterns
    if (dateString_lower.includes('every') || dateString_lower.includes('each') || dateString_lower.includes('weekly')) {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 2); // Assume recurring for next 2 months
      
      return { startDate, endDate };
    }
    
    // Check for seasons
    if (dateString_lower.includes('summer')) {
      const startDate = new Date(currentYear, 5, 21); // June 21st
      const endDate = new Date(currentYear, 8, 22); // September 22nd
      return { startDate, endDate };
    } else if (dateString_lower.includes('fall') || dateString_lower.includes('autumn')) {
      const startDate = new Date(currentYear, 8, 23); // September 23rd
      const endDate = new Date(currentYear, 11, 20); // December 20th
      return { startDate, endDate };
    } else if (dateString_lower.includes('winter')) {
      const startDate = new Date(currentYear, 11, 21); // December 21st
      const endDate = new Date(currentYear + 1, 2, 19); // March 19th of next year
      return { startDate, endDate };
    } else if (dateString_lower.includes('spring')) {
      const startDate = new Date(currentYear, 2, 20); // March 20th
      const endDate = new Date(currentYear, 5, 20); // June 20th
      return { startDate, endDate };
    }
    
    // If we can't parse the date but it's an exhibition
    if (isExhibition) {
      const now = new Date();
      const startDate = new Date(now);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3);
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

module.exports = BeatyBiodiversityMuseumEvents;
