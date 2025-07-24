/**
 * Orpheum Theatre Events Scraper
 * Scrapes events from the Orpheum Theatre in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Orpheum Theatre Events Scraper
 */
const OrpheumTheatreEvents = {
  name: 'Orpheum Theatre',
  url: 'https://www.vancouvercivictheatres.com/venues/orpheum/',
  enabled: true,
  
  /**
   * Parse a date range string into start and end date objects
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object containing startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Look for time pattern and extract
      let timeHours = 0;
      let timeMinutes = 0;
      const timeMatch = dateString.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
      
      if (timeMatch) {
        timeHours = parseInt(timeMatch[1]);
        timeMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && timeHours < 12) timeHours += 12;
        if (!isPM && timeHours === 12) timeHours = 0;
      }
      
      // Match full date with year like "January 15, 2025"
      const fullDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const fullDateMatch = dateString.match(fullDatePattern);
      
      if (fullDateMatch) {
        const month = fullDateMatch[1];
        const day = parseInt(fullDateMatch[2]);
        const year = parseInt(fullDateMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(year, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match short date like "January 15" for current year
      const shortDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const shortDateMatch = dateString.match(shortDatePattern);
      
      if (shortDateMatch) {
        const month = shortDateMatch[1];
        const day = parseInt(shortDateMatch[2]);
        const currentYear = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(currentYear, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(currentYear, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match date in MM/DD/YYYY format
      const numericDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
      const numericMatch = dateString.match(numericDatePattern);
      
      if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1; // JS months are 0-indexed
        const day = parseInt(numericMatch[2]);
        const year = parseInt(numericMatch[3]);
        
        const startDate = new Date(year, month, day, timeHours, timeMinutes);
        const endDate = new Date(year, month, day, 23, 59, 59);
        
        return { startDate, endDate };
      }
      
      // Try ISO format
      if (/\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const isoMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          const startDate = new Date(isoMatch[1]);
          startDate.setHours(timeHours, timeMinutes, 0);
          
          const endDate = new Date(startDate);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parse
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = parsedDate;
        const endDate = new Date(parsedDate);
        endDate.setHours(23, 59, 59);
        
        return { startDate, endDate };
      }
      
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
    
    return `orpheum-theatre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   * @param {string} id - Event ID
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @param {Date} startDate - Event start date
   * @param {Date} endDate - Event end date
   * @param {string} imageUrl - URL to event image
   * @param {string} sourceUrl - URL to original event page
   * @returns {Object} - Event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
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
      categories: [
        'arts',
        'music',
        'performance',
        'theatre',
        'concert'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'orpheum-theatre'
    };
  },
  
  /**
   * Main scraping function to extract events
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
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(20000);
      
      // First, try the direct venue URL
      console.log(`Navigating to venue page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      });
      
      // Check for events on the venue page
      let eventsFound = false;
      try {
        await page.waitForSelector('.event, .event-item, .event-card', { timeout: 5000 });
        eventsFound = true;
      } catch (error) {
        console.log('No event elements found on venue page, will check events calendar');
      }
      
      let eventsData = [];
      
      if (eventsFound) {
        // Extract events from venue page
        eventsData = await page.evaluate(() => {
          const events = [];
          
          // Look for event elements with various selectors
          const eventElements = Array.from(document.querySelectorAll('.event, .event-item, .event-card, article'));
          
          eventElements.forEach(element => {
            const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
            if (!title) return;
            
            const description = element.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
            const dateText = element.querySelector('.date, .event-date, time')?.textContent.trim() || '';
            const imageUrl = element.querySelector('img')?.src || '';
            const linkElement = element.querySelector('a[href]');
            const sourceUrl = linkElement ? linkElement.href : '';
            
            if (title) {
              events.push({
                title,
                description,
                dateText,
                imageUrl,
                sourceUrl
              });
            }
          });
          
          return events;
        });
        
        console.log(`Found ${eventsData.length} potential events on venue page`);
      }
      
      // If no events found on venue page, check the main events calendar
      if (eventsData.length === 0) {
        const calendarUrl = 'https://www.vancouvercivictheatres.com/events/';
        console.log(`Checking events calendar: ${calendarUrl}`);
        
        try {
          await page.goto(calendarUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 20000 
          });
          
          // Wait for events to load
          try {
            await page.waitForSelector('.event, .event-item, .event-card, article', { timeout: 5000 });
          } catch (error) {
            console.log('Could not find event elements on calendar page, trying to proceed anyway');
          }
          
          // Extract events from calendar page
          eventsData = await page.evaluate((venueName) => {
            const events = [];
            
            // Look for event elements with various selectors
            const eventElements = Array.from(document.querySelectorAll('.event, .event-item, .event-card, article, .event-list-item'));
            
            eventElements.forEach(element => {
              const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
              if (!title) return;
              
              // Check if this event is for the Orpheum venue
              const venueElement = element.querySelector('.venue, .location');
              const venueText = venueElement ? venueElement.textContent.trim() : '';
              
              // Skip events not at this venue
              if (venueText && !venueText.toLowerCase().includes('orpheum')) {
                return;
              }
              
              const description = element.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
              const dateText = element.querySelector('.date, .event-date, time')?.textContent.trim() || '';
              const imageUrl = element.querySelector('img')?.src || '';
              const linkElement = element.querySelector('a[href]');
              const sourceUrl = linkElement ? linkElement.href : '';
              
              if (title) {
                events.push({
                  title,
                  description,
                  dateText,
                  imageUrl,
                  sourceUrl,
                  venue: venueText
                });
              }
            });
            
            return events;
          }, this.name);
          
          console.log(`Found ${eventsData.length} potential events on calendar page`);
        } catch (error) {
          console.log(`Error checking calendar page: ${error.message}`);
        }
      }
      
      // Process each event
      for (const eventData of eventsData) {
        const { title, description, dateText, imageUrl, sourceUrl } = eventData;
        
        let eventDetails = {
          title,
          description,
          dateText,
          imageUrl,
          sourceUrl
        };
        
        // If we have a source URL, visit the detail page to get more information
        if (sourceUrl) {
          console.log(`Visiting event detail page: ${sourceUrl}`);
          
          try {
            await page.goto(sourceUrl, { 
              waitUntil: 'networkidle2', 
              timeout: 15000 
            });
            
            // Extract detailed event information
            const detailData = await page.evaluate(() => {
              const title = document.querySelector('h1, .event-title, .title')?.textContent.trim() || '';
              
              const descriptionElement = document.querySelector('.event-description, .description, .content');
              const description = descriptionElement ? descriptionElement.textContent.trim() : '';
              
              const dateElement = document.querySelector('.event-date, .date, time, .datetime');
              const dateText = dateElement ? dateElement.textContent.trim() : '';
              
              // Try to find date in other elements if not found
              const altDateElements = Array.from(document.querySelectorAll('strong, b, .meta, .info'));
              let altDateText = '';
              
              for (const el of altDateElements) {
                const text = el.textContent.trim();
                if (/(?:date|when|time):/i.test(text) || 
                    /(?:\d{1,2}\/\d{1,2}\/\d{4})/.test(text) || 
                    /(?:[a-z]+ \d{1,2}(?:st|nd|rd|th)?)/.test(text)) {
                  altDateText = text;
                  break;
                }
              }
              
              return {
                title,
                description,
                dateText: dateText || altDateText,
                imageUrl: document.querySelector('.event-image img, .featured-image img')?.src || ''
              };
            });
            
            // Update event details with more complete information
            if (detailData.title) eventDetails.title = detailData.title;
            if (detailData.description) eventDetails.description = detailData.description;
            if (detailData.dateText) eventDetails.dateText = detailData.dateText;
            if (detailData.imageUrl) eventDetails.imageUrl = detailData.imageUrl;
          } catch (error) {
            console.log(`Error accessing event detail page: ${error.message}`);
          }
        }
        
        // Parse date information
        const dateInfo = this.parseDateRange(eventDetails.dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventDetails.title}" due to invalid date: "${eventDetails.dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(eventDetails.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          eventDetails.title,
          eventDetails.description,
          dateInfo.startDate,
          dateInfo.endDate,
          eventDetails.imageUrl,
          eventDetails.sourceUrl || this.url
        );
        
        // Add event to events array
        events.push(event);
      }
      
      console.log(`Found ${events.length} events from ${this.name}`);
      
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return events;
  }
};

module.exports = OrpheumTheatreEvents;
