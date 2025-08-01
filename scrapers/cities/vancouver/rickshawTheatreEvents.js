/**
 * Rickshaw Theatre Events Scraper
 * Scrapes events from the Rickshaw Theatre in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Rickshaw Theatre Events Scraper
 */
const RickshawTheatreEvents = {
  name: 'Rickshaw Theatre',
  url: 'https://www.rickshawtheatre.com/events',
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
      
      // Handle format: "Friday July 26 2024" or "Fri Jul 26" or similar variations
      const dayMonthPattern = /(?:(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:,\s*)?(\d{4})?/i;
      const dayMonthMatch = dateString.match(dayMonthPattern);
      
      if (dayMonthMatch) {
        const month = dayMonthMatch[1];
        const day = parseInt(dayMonthMatch[2]);
        // If year is not specified, use current year
        const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3]) : new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Look for time information
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/;
          const timeMatch = dateString.match(timePattern);
          
          let hours = 20; // Default to 8:00 PM for concerts if no time provided
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
          
          const startDate = new Date(year, monthNum, day, hours, minutes);
          
          // For events, typically set endDate to 3 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Handle format with more explicit time: "July 26, 2024 8:00PM"
      const dateTimePattern = /([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}),?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
      const dateTimeMatch = dateString.match(dateTimePattern);
      
      if (dateTimeMatch) {
        const month = dateTimeMatch[1];
        const day = parseInt(dateTimeMatch[2]);
        const year = parseInt(dateTimeMatch[3]);
        const hours = parseInt(dateTimeMatch[4]);
        const minutes = dateTimeMatch[5] ? parseInt(dateTimeMatch[5]) : 0;
        const meridiem = dateTimeMatch[6].toLowerCase();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          let hours24 = hours;
          if (meridiem === 'pm' && hours < 12) hours24 += 12;
          if (meridiem === 'am' && hours === 12) hours24 = 0;
          
          const startDate = new Date(year, monthNum, day, hours24, minutes);
          
          // For events, typically set endDate to 3 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        // Default to 8:00 PM for concerts if time not included in standard date
        const hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/);
        
        const startDate = new Date(parsedDate);
        if (!hasTimeInfo) {
          startDate.setHours(20, 0, 0);
        }
        
        // For events, typically set endDate to 3 hours after startDate
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
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
    
    return `rickshaw-theatre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, price) {
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
        name: 'Rickshaw Theatre',
        address: '254 East Hastings Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6A 1P1',
        website: 'https://www.rickshawtheatre.com',
        googleMapsUrl: 'https://goo.gl/maps/nhkohQjrW8uBw2cF8'
      },
      categories: [
        'music',
        'concert',
        'live-music',
        'nightlife',
        'entertainment'
      ],
      price: price || '',
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'rickshaw-theatre'
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
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      try {
        await page.waitForSelector('.event, .eventlist-event, article, .event-card, .eventlist-column', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event, .eventlist-event, article, .event-card, .eventlist-column, .list-view-item'
        ));
        
        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .eventlist-title, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .eventlist-description, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.eventlist-meta-date, .date, time, .event-date')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          const priceElement = element.querySelector('.eventlist-meta-price, .price');
          const price = priceElement ? priceElement.textContent.trim() : '';
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            price
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event data
      for (const eventData of eventsData) {
        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          eventData.title,
          eventData.description,
          dateInfo.startDate,
          dateInfo.endDate,
          eventData.imageUrl,
          eventData.sourceUrl,
          eventData.price
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

module.exports = RickshawTheatreEvents;
