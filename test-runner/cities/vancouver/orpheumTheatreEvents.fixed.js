/**
 * Orpheum Theatre Events Scraper (Fixed Version)
 * Scrapes events from the Orpheum Theatre in Vancouver using improved selectors and error handling
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

/**
 * Orpheum Theatre Events Scraper
 */
const OrpheumTheatreEvents = {
  name: 'Orpheum Theatre',
  url: 'https://www.vancouvercivictheatres.com/venues/orpheum/',
  eventsUrl: 'https://www.vancouvercivictheatres.com/events/',
  enabled: true,
  
  /**
   * Parse a date string into a Date object
   */
  parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Extract time if present
      let timeHours = 19; // Default to 7pm if no time specified
      let timeMinutes = 0;
      const timeMatch = dateString.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
      
      if (timeMatch) {
        timeHours = parseInt(timeMatch[1]);
        timeMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && timeHours < 12) timeHours += 12;
        if (!isPM && timeHours === 12) timeHours = 0;
      }
      
      // Try various date formats
      // Full date: "January 15, 2025"
      let match = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i);
      if (match) {
        const month = this._getMonthNumber(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        if (month !== -1 && day >= 1 && day <= 31) {
          return new Date(year, month, day, timeHours, timeMinutes);
        }
      }
      
      // Short date: "January 15" (current year)
      match = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i);
      if (match) {
        const month = this._getMonthNumber(match[1]);
        const day = parseInt(match[2]);
        const year = new Date().getFullYear();
        
        if (month !== -1 && day >= 1 && day <= 31) {
          return new Date(year, month, day, timeHours, timeMinutes);
        }
      }
      
      // MM/DD/YYYY format
      match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        return new Date(year, month, day, timeHours, timeMinutes);
      }
      
      // Try standard date parse as fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      return null;
    } catch (error) {
      console.error(`Error parsing date "${dateString}": ${error.message}`);
      return null;
    }
  },
  
  /**
   * Helper to convert month name to month number
   */
  _getMonthNumber(monthName) {
    const months = {
      january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
      april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
      august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
      november: 10, nov: 10, december: 11, dec: 11
    };
    
    return months[monthName.toLowerCase()] !== undefined ? 
      months[monthName.toLowerCase()] : -1;
  },
  
  /**
   * Generate a unique ID for an event
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
    
    return `orpheum-theatre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate: endDate || startDate, // Default to same day if no end date
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: sourceUrl || this.url,
      venue: {
        name: 'Orpheum Theatre',
        address: '601 Smithe Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 3L4',
        website: 'https://www.vancouvercivictheatres.com/venues/orpheum/',
        googleMapsUrl: 'https://goo.gl/maps/Kc4BKwaBC8dfDnty8'
      },
      categories: ['arts', 'music', 'performance', 'theatre', 'concert'],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'orpheum-theatre'
    };
  },

  /**
   * Save debug information for analysis
   */
  async saveDebugInfo(page, name) {
    try {
      const debugDir = path.join(__dirname, '../../restored-scrapers/debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save screenshot
      const screenshotPath = path.join(debugDir, `orpheum-${name}-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML
      const htmlPath = path.join(debugDir, `orpheum-${name}-${Date.now()}.html`);
      const html = await page.content();
      fs.writeFileSync(htmlPath, html);
      
      // Save detailed HTML for analysis
      const detailedHtmlPath = path.join(debugDir, `orpheum-detailed-debug-${Date.now()}.html`);
      const detailedHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Orpheum Theatre Debug</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              h1 { color: #333; }
              pre { background: #f5f5f5; padding: 10px; overflow: auto; }
            </style>
          </head>
          <body>
            <h1>Orpheum Theatre Debug - ${name}</h1>
            <h2>URL: ${await page.url()}</h2>
            <h2>HTML Content</h2>
            <pre>${html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          </body>
        </html>
      `;
      fs.writeFileSync(detailedHtmlPath, detailedHtml);
      
      console.log(`Saved detailed debug HTML to ${detailedHtmlPath}`);
    } catch (error) {
      console.error(`Could not save debug info: ${error.message}`);
    }
  },
  
  /**
   * Main scraping function with improved selectors and error handling
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
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-features=site-per-process',
          '--disable-web-security'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');
      
      // Add console logging from browser
      page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
      
      // First try venue page
      console.log(`--- Navigating to venue page: ${this.url} ---`);
      try {
        await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log('Successfully loaded Orpheum Theatre venue page');
        await this.saveDebugInfo(page, 'venue-page');
        
        // Try to find events on the venue page
        const venuePageEvents = await this._extractEventsFromVenuePage(page);
        if (venuePageEvents && venuePageEvents.length > 0) {
          console.log(`Found ${venuePageEvents.length} events on venue page`);
          events.push(...venuePageEvents);
        } else {
          console.log('No event elements found on venue page, will check events calendar');
        }
      } catch (error) {
        console.log(`Error loading venue page: ${error.message}`);
      }
      
      // If no events found on venue page, check the events calendar
      if (events.length === 0) {
        console.log(`--- Checking events calendar: ${this.eventsUrl} ---`);
        try {
          await page.goto(this.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          console.log('Successfully loaded Vancouver Civic Theatres calendar page');
          await this.saveDebugInfo(page, 'calendar-page');
          
          const calendarEvents = await this._extractEventsFromCalendarPage(page);
          if (calendarEvents && calendarEvents.length > 0) {
            console.log(`Found ${calendarEvents.length} events on calendar page`);
            events.push(...calendarEvents);
          } else {
            console.log('Could not find event elements on calendar page');
          }
        } catch (error) {
          console.log(`Error checking calendar page: ${error.message}`);
        }
      }
      
      console.log(`Found ${events.length} events from ${this.name}`);
      
      // If no events found, add a note but don't use fallback events
      if (events.length === 0) {
        console.log(`No events found for ${this.name}. Not using fallbacks per user preference.`);
      }
      
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return events;
  },
  
  /**
   * Extract events from the venue page
   */
  async _extractEventsFromVenuePage(page) {
    try {
      // Wait for potential event elements
      try {
        await page.waitForSelector('.elementor-widget-container, .elementor-text-editor', { timeout: 10000 });
      } catch (error) {
        console.log('Timeout waiting for venue page event elements');
      }
      
      // Extract events using a more flexible approach
      const events = await page.evaluate(async (venueUrl) => {
        const extractedEvents = [];
        
        // Look for event information in the page
        // First look for structured event elements
        const eventContainers = Array.from(document.querySelectorAll('.event-item, .elementor-widget-container, .upcoming-events, .event-listing'));
        
        for (const container of eventContainers) {
          // Check if this container has event-like content
          const text = container.textContent.toLowerCase();
          if (text.includes('concert') || text.includes('show') || 
              text.includes('event') || text.includes('performance') ||
              text.includes('ticket') || text.includes('pm') || 
              (text.includes('jan') && text.includes('202')) ||
              (text.includes('feb') && text.includes('202')) ||
              (text.includes('mar') && text.includes('202')) ||
              (text.includes('apr') && text.includes('202'))) {
            
            // Try to extract title, date, and link
            const titleElement = container.querySelector('h2, h3, h4, h5, strong, b');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Find date-like text
            const paragraphs = Array.from(container.querySelectorAll('p, div, span'));
            let dateText = '';
            let description = '';
            
            for (const p of paragraphs) {
              const pText = p.textContent.trim();
              
              // Check if this contains a date
              if (!dateText && (
                  pText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
                  pText.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/) ||
                  pText.match(/\b\d{1,2}:\d{2}\s*(am|pm)\b/i)
                )) {
                dateText = pText;
              } 
              // Otherwise use as description if it's substantial
              else if (pText.length > 20) {
                description = pText;
              }
            }
            
            // Find a link if any
            const linkElement = container.querySelector('a');
            const eventUrl = linkElement ? linkElement.href : '';
            
            // Find an image if any
            const imgElement = container.querySelector('img');
            const imageUrl = imgElement ? imgElement.src : '';
            
            if (title) {
              extractedEvents.push({
                title,
                description,
                dateText,
                imageUrl,
                sourceUrl: eventUrl || venueUrl
              });
            }
          }
        }
        
        // If structured approach didn't find events, try a broader approach
        if (extractedEvents.length === 0) {
          // Look for any headings that might be event titles
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5'))
            .filter(h => {
              const text = h.textContent.toLowerCase().trim();
              return text.length > 5 && 
                    !text.includes('menu') && 
                    !text.includes('footer');
            });
          
          for (const heading of headings) {
            const title = heading.textContent.trim();
            
            // Find siblings or nearby elements for date and description
            let dateText = '';
            let description = '';
            let eventUrl = '';
            let imageUrl = '';
            
            // Check if the heading is in a link
            if (heading.closest('a')) {
              eventUrl = heading.closest('a').href;
            }
            
            // Look at next siblings
            let nextEl = heading.nextElementSibling;
            for (let i = 0; i < 3 && nextEl; i++) {
              const text = nextEl.textContent.trim();
              
              // Check if this contains a date
              if (!dateText && (
                  text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
                  text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/) ||
                  text.match(/\b\d{1,2}:\d{2}\s*(am|pm)\b/i)
                )) {
                dateText = text;
              } 
              // Use as description
              else if (text.length > 20 && !description) {
                description = text;
              }
              
              // Check for links
              if (!eventUrl && nextEl.querySelector('a')) {
                eventUrl = nextEl.querySelector('a').href;
              }
              
              // Check for images
              if (!imageUrl && nextEl.querySelector('img')) {
                imageUrl = nextEl.querySelector('img').src;
              }
              
              nextEl = nextEl.nextElementSibling;
            }
            
            // Only add if we found some event-like information
            if (title && (dateText || eventUrl)) {
              extractedEvents.push({
                title,
                description,
                dateText,
                imageUrl,
                sourceUrl: eventUrl || venueUrl
              });
            }
          }
        }
        
        return extractedEvents;
      }, this.url);
      
      // Process extracted events
      const processedEvents = [];
      
      for (const eventData of events) {
        // Parse date
        const startDate = this.parseDate(eventData.dateText);
        if (!startDate) {
          console.log(`Could not parse date for event "${eventData.title}": "${eventData.dateText}"`);
          continue;
        }
        
        // Create end date (same day, end of day)
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
        
        // Generate ID
        const id = this.generateEventId(eventData.title, startDate);
        
        // Create event object
        const event = this.createEventObject(
          id,
          eventData.title,
          eventData.description,
          startDate,
          endDate,
          eventData.imageUrl,
          eventData.sourceUrl
        );
        
        processedEvents.push(event);
      }
      
      return processedEvents;
      
    } catch (error) {
      console.error(`Error extracting events from venue page: ${error.message}`);
      return [];
    }
  },
  
  /**
   * Extract events from the calendar page
   */
  async _extractEventsFromCalendarPage(page) {
    try {
      // Wait for potential event elements
      try {
        await page.waitForSelector('.elementor-widget-container, .events-list', { timeout: 10000 });
      } catch (error) {
        console.log('Timeout waiting for calendar page event elements');
      }
      
      // Use a more flexible approach to find events
      const events = await page.evaluate(async (venueName) => {
        const extractedEvents = [];
        
        // First try to find event elements
        const eventElements = Array.from(document.querySelectorAll('.event, .event-item, article, .elementor-post, .elementor-column'));
        
        for (const element of eventElements) {
          // Check if this element is about our venue
          const text = element.textContent.toLowerCase();
          if (!text.includes('orpheum')) continue;
          
          // Extract event details
          const title = element.querySelector('h3, h4, h5, .title')?.textContent.trim() || '';
          
          // Skip if no title
          if (!title) continue;
          
          // Get description
          const descriptionElement = element.querySelector('p, .description, .excerpt');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Get date
          const dateElement = element.querySelector('.date, time, [class*="date"]');
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          
          // Get image
          const imgElement = element.querySelector('img');
          const imageUrl = imgElement ? imgElement.src : '';
          
          // Get link
          const linkElement = element.querySelector('a');
          const eventUrl = linkElement ? linkElement.href : '';
          
          if (title) {
            extractedEvents.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl: eventUrl,
              venue: venueName
            });
          }
        }
        
        return extractedEvents;
      }, this.name);
      
      // Process extracted events
      const processedEvents = [];
      
      for (const eventData of events) {
        // Parse date
        const startDate = this.parseDate(eventData.dateText);
        if (!startDate) {
          console.log(`Could not parse date for event "${eventData.title}": "${eventData.dateText}"`);
          continue;
        }
        
        // Create end date (same day, end of day)
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59);
        
        // Generate ID
        const id = this.generateEventId(eventData.title, startDate);
        
        // Create event object
        const event = this.createEventObject(
          id,
          eventData.title,
          eventData.description,
          startDate,
          endDate,
          eventData.imageUrl,
          eventData.sourceUrl || this.eventsUrl
        );
        
        processedEvents.push(event);
      }
      
      return processedEvents;
      
    } catch (error) {
      console.error(`Error extracting events from calendar page: ${error.message}`);
      return [];
    }
  }
};

module.exports = OrpheumTheatreEvents;
