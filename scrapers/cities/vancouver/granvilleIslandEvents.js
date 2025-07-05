/**
 * Granville Island Events Scraper
 * Scrapes events from Granville Island in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Granville Island Events Scraper
 */
const GranvilleIslandEvents = {
  name: 'Granville Island Events',
  url: 'https://granvilleisland.com/events',
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
      
      // Check for ISO date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const parts = dateString.split(' - ');
        const startDate = new Date(parts[0]);
        const endDate = parts.length > 1 ? new Date(parts[1]) : new Date(startDate);
        
        // Set end date to end of day if it's the same as start date
        if (parts.length === 1) {
          endDate.setHours(23, 59, 59);
        }
        
        return { startDate, endDate };
      }
      
      // Match patterns like "January 15 - February 20, 2025" or "Jan 15 - 20, 2025"
      const datePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[–—-]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}))?,?\s*(\d{4})/i;
      const match = dateString.match(datePattern);
      
      if (match) {
        const startMonth = match[1];
        const startDay = parseInt(match[2]);
        const endMonth = match[3] || startMonth;
        const endDay = match[4] ? parseInt(match[4]) : startDay;
        const year = parseInt(match[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay);
          const endDate = new Date(year, endMonthNum, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try to handle more date formats with Date.parse
      const dateParts = dateString.split(/\s*[–—-]\s*/);
      if (dateParts.length > 0) {
        // Try to parse the first part as a date
        const startDate = new Date(dateParts[0]);
        
        if (!isNaN(startDate.getTime())) {
          let endDate;
          
          if (dateParts.length > 1) {
            // If there's a range, parse the end date
            endDate = new Date(dateParts[1]);
            
            // If only the day was specified in the end date, copy year/month from start date
            if (/^\d{1,2}(st|nd|rd|th)?$/i.test(dateParts[1].trim())) {
              const day = parseInt(dateParts[1]);
              endDate = new Date(startDate);
              endDate.setDate(day);
            }
          } else {
            // If no range, end date is same as start but at end of day
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59);
          }
          
          if (!isNaN(endDate.getTime())) {
            return { startDate, endDate };
          }
        }
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
    
    return `granville-island-${slug}-${dateStr}`;
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
        name: 'Granville Island',
        address: '1689 Johnston Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6H 3R9',
        website: 'https://granvilleisland.com/',
        googleMapsUrl: 'https://goo.gl/maps/io5j2JzQhQqKCWDY9'
      },
      categories: [
        'arts',
        'festival',
        'market',
        'entertainment',
        'family'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'granville-island'
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
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(20000);
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });
      
      // Wait for events to load
      try {
        await page.waitForSelector('.event, .events-list, .views-row', { timeout: 5000 });
      } catch (error) {
        console.log('Could not find event elements using standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      console.log('Extracting events data...');
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Look for event elements with various possible selectors
        const eventElements = Array.from(document.querySelectorAll('.event, .views-row, .event-item, article, .event-listing'));
        
        eventElements.forEach(element => {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, .title, .event-title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          if (!title) return; // Skip events without titles
          
          // Extract description
          const descriptionElement = element.querySelector('p, .description, .field-content, .event-description');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('.date, .event-date, .datetime, time, .field-event-date');
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          
          // Extract image URL
          let imageUrl = '';
          const imageElement = element.querySelector('img');
          if (imageElement && imageElement.src) {
            imageUrl = imageElement.src;
          }
          
          // Extract source URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a[href]');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          // Only add events with both title and date
          if (title && (dateText || description)) {
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
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event
      for (const eventData of eventsData) {
        const { title, description, dateText, imageUrl, sourceUrl } = eventData;
        
        // Parse date information
        const dateInfo = this.parseDateRange(dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${title}" due to invalid date: "${dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          title,
          description,
          dateInfo.startDate,
          dateInfo.endDate,
          imageUrl,
          sourceUrl
        );
        
        // Add event to events array
        events.push(event);
      }
      
      // If no events found, try to check the calendar page if it exists
      if (events.length === 0) {
        const calendarUrl = 'https://granvilleisland.com/calendar';
        console.log(`No events found, checking calendar page: ${calendarUrl}`);
        
        try {
          await page.goto(calendarUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 20000 
          });
          
          // Wait for calendar events to load
          try {
            await page.waitForSelector('.calendar-event, .views-row, .event', { timeout: 5000 });
          } catch (error) {
            console.log('Could not find calendar event elements, trying to proceed anyway');
          }
          
          // Extract calendar events
          const calendarEvents = await page.evaluate(() => {
            const events = [];
            
            const eventElements = Array.from(document.querySelectorAll('.calendar-event, .views-row, .event, .event-item'));
            
            eventElements.forEach(element => {
              const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
              if (!title) return;
              
              const description = element.querySelector('p, .description, .field-content')?.textContent.trim() || '';
              const dateText = element.querySelector('.date, .event-date, time, .field-event-date')?.textContent.trim() || '';
              const imageUrl = element.querySelector('img')?.src || '';
              const sourceUrl = element.querySelector('a[href]')?.href || '';
              
              if (title && (dateText || description)) {
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
          
          // Process calendar events
          for (const eventData of calendarEvents) {
            const dateInfo = this.parseDateRange(eventData.dateText);
            
            if (!dateInfo.startDate || !dateInfo.endDate) {
              console.log(`Skipping calendar event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
              continue;
            }
            
            const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
            
            const event = this.createEventObject(
              eventId,
              eventData.title,
              eventData.description,
              dateInfo.startDate,
              dateInfo.endDate,
              eventData.imageUrl,
              eventData.sourceUrl || calendarUrl
            );
            
            events.push(event);
          }
        } catch (error) {
          console.log(`Error checking calendar page: ${error.message}`);
        }
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

module.exports = GranvilleIslandEvents;
