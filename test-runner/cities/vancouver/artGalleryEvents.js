/**
 * Vancouver Art Gallery Events Scraper
 * Scrapes events and exhibitions from the Vancouver Art Gallery
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

/**
 * Vancouver Art Gallery Events Scraper
 */
const ArtGalleryEvents = {
  name: 'Vancouver Art Gallery',
  url: 'https://www.vanartgallery.bc.ca/exhibitions-events',
  enabled: true,
  
  /**
   * Parse date strings into start and end date objects
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object with startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Handle format: "January 1, 2025 – April 30, 2025"
      const fullDateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})\s*[–\-]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const fullDateRangeMatch = dateString.match(fullDateRangePattern);
      
      if (fullDateRangeMatch) {
        const startMonth = fullDateRangeMatch[1];
        const startDay = parseInt(fullDateRangeMatch[2]);
        const startYear = parseInt(fullDateRangeMatch[3]);
        const endMonth = fullDateRangeMatch[4];
        const endDay = parseInt(fullDateRangeMatch[5]);
        const endYear = parseInt(fullDateRangeMatch[6]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(startYear, startMonthNum, startDay, 10, 0, 0); // Gallery opens at 10am
          const endDate = new Date(endYear, endMonthNum, endDay, 17, 0, 0); // Gallery closes at 5pm
          
          return { startDate, endDate };
        }
      }
      
      // Handle format: "January 1 – April 30, 2025" (same year)
      const sameYearDateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[–\-]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const sameYearDateRangeMatch = dateString.match(sameYearDateRangePattern);
      
      if (sameYearDateRangeMatch) {
        const startMonth = sameYearDateRangeMatch[1];
        const startDay = parseInt(sameYearDateRangeMatch[2]);
        const endMonth = sameYearDateRangeMatch[3];
        const endDay = parseInt(sameYearDateRangeMatch[4]);
        const year = parseInt(sameYearDateRangeMatch[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay, 10, 0, 0); // Gallery opens at 10am
          const endDate = new Date(year, endMonthNum, endDay, 17, 0, 0); // Gallery closes at 5pm
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date format with time: "January 1, 2025, 10am – 5pm"
      const singleDateTimePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})(?:,\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–\-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i;
      const singleDateTimeMatch = dateString.match(singleDateTimePattern);
      
      if (singleDateTimeMatch) {
        const month = singleDateTimeMatch[1];
        const day = parseInt(singleDateTimeMatch[2]);
        const year = parseInt(singleDateTimeMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          let startHour = 10; // Default to 10am
          let endHour = 17;   // Default to 5pm
          
          // If time information is provided
          if (singleDateTimeMatch[4]) {
            startHour = parseInt(singleDateTimeMatch[4]);
            const startMinute = singleDateTimeMatch[5] ? parseInt(singleDateTimeMatch[5]) : 0;
            const startMeridiem = singleDateTimeMatch[6].toLowerCase();
            
            // Convert to 24-hour format
            if (startMeridiem === 'pm' && startHour < 12) startHour += 12;
            if (startMeridiem === 'am' && startHour === 12) startHour = 0;
            
            // End time if provided
            if (singleDateTimeMatch[7]) {
              endHour = parseInt(singleDateTimeMatch[7]);
              const endMinute = singleDateTimeMatch[8] ? parseInt(singleDateTimeMatch[8]) : 0;
              const endMeridiem = singleDateTimeMatch[9].toLowerCase();
              
              // Convert to 24-hour format
              if (endMeridiem === 'pm' && endHour < 12) endHour += 12;
              if (endMeridiem === 'am' && endHour === 12) endHour = 0;
            }
          }
          
          const startDate = new Date(year, monthNum, day, startHour, 0, 0);
          const endDate = new Date(year, monthNum, day, endHour, 0, 0);
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date format: "January 1, 2025"
      const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const singleDateMatch = dateString.match(singleDatePattern);
      
      if (singleDateMatch) {
        const month = singleDateMatch[1];
        const day = parseInt(singleDateMatch[2]);
        const year = parseInt(singleDateMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // For single date events like exhibitions, they usually run all day
          const startDate = new Date(year, monthNum, day, 10, 0, 0); // Gallery opens at 10am
          const endDate = new Date(year, monthNum, day, 17, 0, 0);   // Gallery closes at 5pm
          
          return { startDate, endDate };
        }
      }
      
      // Handle "Ongoing" or "Permanent Exhibition" case
      if (dateString.toLowerCase().includes('ongoing') || dateString.toLowerCase().includes('permanent')) {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(10, 0, 0); // Gallery opens at 10am
        
        const endDate = new Date(currentDate);
        endDate.setFullYear(currentDate.getFullYear() + 1); // Set end date to 1 year from now
        endDate.setHours(17, 0, 0); // Gallery closes at 5pm
        
        return { startDate, endDate };
      }
      
      // No fallback date parsing - we'll skip events with unparseable dates
      console.log(`Could not parse date with standard patterns: ${dateString}`);
      
      console.log(`Could not parse date: ${dateString}`);
      return { startDate: null, endDate: null };
      
    } catch (error) {
      console.error(`Error parsing date "${dateString}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
  },
  
  /**
   * Generate a unique ID for an event
   * @param {string} title - The event title
   * @param {Date} startDate - The start date of the event
   * @returns {string} - Unique event ID
   */
  generateEventId(title, startDate) {
    if (!title) return '';
    
    let dateStr = '';
    if (startDate && !isNaN(startDate.getTime())) {
      dateStr = startDate.toISOString().split('T')[0];
    }
    
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `vag-${slug}-${dateStr}`;
  },
  
  /**
   * Save debug information for troubleshooting
   * @param {Object} page - Puppeteer page object
   * @param {string} prefix - Prefix for the filename
   * @param {string} debugDir - Directory to save debug info to
   */
  async _saveDebugInfo(page, prefix, debugDir) {
    try {
      if (!page) return;
      
      // Generate a unique filename using timestamp
      const timestamp = Date.now();
      const filename = `${prefix}_${timestamp}`;
      
      // Save screenshot
      await page.screenshot({ path: path.join(debugDir, `${filename}.png`), fullPage: true });
      
      // Save HTML content
      const html = await page.content();
      fs.writeFileSync(path.join(debugDir, `${filename}.html`), html);
      
      console.log(`Saved debug info: ${filename}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, type) {
    // Define categories based on event type
    let categories = ['art', 'exhibition', 'culture'];
    
    if (type) {
      type = type.toLowerCase();
      if (type.includes('workshop') || type.includes('class')) {
        categories.push('workshop');
        categories.push('education');
      } else if (type.includes('talk') || type.includes('lecture') || type.includes('tour')) {
        categories.push('talk');
        categories.push('education');
      } else if (type.includes('performance')) {
        categories.push('performance');
      } else if (type.includes('family') || type.includes('children')) {
        categories.push('family-friendly');
      }
    }
    
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: 'https://www.vanartgallery.bc.ca/visit',
      venue: {
        name: 'Vancouver Art Gallery',
        address: '750 Hornby St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 2H7',
        website: 'https://www.vanartgallery.bc.ca/',
        googleMapsUrl: 'https://goo.gl/maps/CXvHLUYfX5mcgU8L9'
      },
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'vancouver-art-gallery'
    };
  },
  
  /**
   * Main scraping function
   * @returns {Promise<Array>} - Array of event objects
   */
  async scrape() {
    if (!this.enabled) {
      console.log(`${this.name} scraper is disabled`);
      return [];
    }
    
    console.log(`🔍 Scraping events from ${this.name}...`);
    const events = [];
    let browser;
    
    try {
      // Create debug directory if it doesn't exist
      const debugDir = path.join(__dirname, '..', '..', 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }

      // Launch browser with enhanced stealth options
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,800',
        ]
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      
      // Use a modern user agent
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
      await page.setUserAgent(userAgent);
      
      // Set extra headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
      });
      
      // Set up request interception to block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const blockedResources = ['image', 'media', 'font', 'stylesheet'];
        
        if (blockedResources.includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Use shorter timeout
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Wait for exhibition or event listings
      try {
        await page.waitForSelector('.exhibition-item, .event-item, article, .exhibitions, .events', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find standard event selectors, trying to proceed anyway');
        await this._saveDebugInfo(page, 'selector_error', debugDir);
      }
      
      // First, scrape exhibitions
      console.log('Scraping exhibitions...');
      const exhibitions = await page.evaluate(() => {
        const items = [];
        
        // Try different selectors for exhibitions
        const exhibitionElements = Array.from(document.querySelectorAll(
          '.exhibition-item, .exhibition, article, .exhibition-card, [data-category="exhibition"]'
        ));
        
        exhibitionElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, .exhibition-date, .dates')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          
          items.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            type: 'Exhibition'
          });
        });
        
        return items;
      });
      
      console.log(`Found ${exhibitions.length} potential exhibitions`);
      
      // Next, scrape events
      console.log('Navigating to events page...');
      
      // Check if there's a dedicated events page
      let eventsUrl = await page.evaluate(() => {
        const eventsLink = document.querySelector('a[href*="events"], a[href*="calendar"], a[href*="programs"]');
        return eventsLink ? eventsLink.href : null;
      });
      
      let events_data = [];
      
      if (eventsUrl) {
        console.log(`Found events page: ${eventsUrl}`);
        await page.goto(eventsUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        
        try {
          await page.waitForSelector('.event-item, .event, article, .events-listing', { timeout: 8000 });
        } catch (error) {
          console.log('Could not find standard event selectors on events page, trying to proceed anyway');
          await this._saveDebugInfo(page, 'events_selector_error', debugDir);
        }
        
        events_data = await page.evaluate(() => {
          const items = [];
          
          // Try different selectors for events
          const eventElements = Array.from(document.querySelectorAll(
            '.event-item, .event, article, .program-item, [data-category="event"]'
          ));
          
          eventElements.forEach(element => {
            const title = element.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
            if (!title) return;
            
            const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
            const dateText = element.querySelector('.date, time, .event-date, .dates')?.textContent.trim() || '';
            const imageUrl = element.querySelector('img')?.src || '';
            const sourceUrl = element.querySelector('a[href]')?.href || '';
            
            // Try to determine event type
            let type = 'Event';
            const typeElement = element.querySelector('.type, .category, .event-type');
            if (typeElement) {
              type = typeElement.textContent.trim();
            } else if (title.toLowerCase().includes('workshop')) {
              type = 'Workshop';
            } else if (title.toLowerCase().includes('talk') || title.toLowerCase().includes('lecture')) {
              type = 'Talk';
            } else if (title.toLowerCase().includes('tour')) {
              type = 'Tour';
            } else if (title.toLowerCase().includes('family') || title.toLowerCase().includes('kids')) {
              type = 'Family Program';
            }
            
            items.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              type
            });
          });
          
          return items;
        });
      }
      
      console.log(`Found ${events_data.length} potential events`);
      
      // Combine exhibitions and events
      const allItems = [...exhibitions, ...events_data];
      
      // Process each item
      for (const item of allItems) {
        // Skip items with no title
        if (!item.title) {
          console.log('Skipping event due to missing title');
          continue;
        }
        
        // Skip items with no description
        if (!item.description) {
          console.log(`Skipping "${item.title}" due to missing description`);
          continue;
        }
        
        // Parse date information
        const dateInfo = this.parseDateRange(item.dateText);
        
        // Skip items with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping "${item.title}" due to invalid date: "${item.dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(item.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          item.title,
          item.description,
          dateInfo.startDate,
          dateInfo.endDate,
          item.imageUrl,
          item.sourceUrl,
          item.type
        );
        
        // Add event to events array
        events.push(event);
      }
      
      console.log(`Found ${events.length} events from ${this.name}`);
      
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
      try {
        if (page) {
          await this._saveDebugInfo(page, 'scraper_error', debugDir);
        }
      } catch (debugError) {
        console.error(`Could not save debug info: ${debugError.message}`);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return events;
  }
};

module.exports = ArtGalleryEvents;
