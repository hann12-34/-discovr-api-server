/**
 * Science World Events Scraper
 * Scrapes events from Science World in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Science World Events Scraper
 */
const ScienceWorldEvents = {
  name: 'Science World',
  url: 'https://www.scienceworld.ca/events/',
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
      
      // Extract time if present
      const timeMatch = dateString.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
      let timeHours = 0;
      let timeMinutes = 0;
      
      if (timeMatch) {
        timeHours = parseInt(timeMatch[1]);
        timeMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && timeHours < 12) timeHours += 12;
        if (!isPM && timeHours === 12) timeHours = 0;
      }
      
      // Date patterns
      const patterns = [
        // ISO format: 2025-07-15
        {
          regex: /(\d{4}-\d{2}-\d{2})/,
          parse: (match) => {
            const date = new Date(match[1]);
            return isNaN(date.getTime()) ? null : date;
          }
        },
        // Full date: July 15, 2025
        {
          regex: /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i,
          parse: (match) => {
            const months = {
              january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
              april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
              august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
              november: 10, nov: 10, december: 11, dec: 11
            };
            
            const month = months[match[1].toLowerCase()];
            if (month === undefined) return null;
            
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            return new Date(year, month, day);
          }
        },
        // Current year date: July 15
        {
          regex: /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
          parse: (match) => {
            const months = {
              january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
              april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
              august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
              november: 10, nov: 10, december: 11, dec: 11
            };
            
            const month = months[match[1].toLowerCase()];
            if (month === undefined) return null;
            
            const day = parseInt(match[2]);
            const year = new Date().getFullYear();
            return new Date(year, month, day);
          }
        }
      ];
      
      // Try each pattern
      for (const pattern of patterns) {
        const match = dateString.match(pattern.regex);
        if (match) {
          const parsedDate = pattern.parse(match);
          if (parsedDate) {
            const startDate = new Date(parsedDate);
            startDate.setHours(timeHours, timeMinutes, 0);
            
            const endDate = new Date(parsedDate);
            endDate.setHours(23, 59, 59);
            
            return { startDate, endDate };
          }
        }
      }
      
      // Try standard date parsing as fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
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
    
    return `science-world-${slug}-${dateStr}`;
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
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: sourceUrl || this.url,
      venue: {
        name: 'Science World',
        address: '1455 Quebec Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6A 3Z7',
        website: 'https://www.scienceworld.ca/',
        googleMapsUrl: 'https://goo.gl/maps/5qRqjfjJ2rPD3idy5'
      },
      categories: [
        'science',
        'education',
        'exhibition',
        'family'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'science-world'
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 20000 });
      
      try {
        await page.waitForSelector('.event, .event-card, article, .event-item', { timeout: 10000 });
      } catch (error) {
        console.log('Could not find event elements, trying to proceed anyway');
      }
      
      const eventsData = await page.evaluate(() => {
        const events = [];
        const eventElements = Array.from(document.querySelectorAll('.event, .event-card, article, .event-item, .event-list-item'));
        
        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, .event-date, time, .datetime')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          
          if (title) {
            events.push({ title, description, dateText, imageUrl, sourceUrl });
          }
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
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
          eventData.sourceUrl
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

module.exports = ScienceWorldEvents;
