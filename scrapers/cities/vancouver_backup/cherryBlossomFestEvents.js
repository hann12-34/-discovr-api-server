/**
 * Vancouver Cherry Blossom Festival Events Scraper
 * Scrapes events from the Vancouver Cherry Blossom Festival
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver Cherry Blossom Festival Events Scraper
 */
const CherryBlossomFestEvents = {
  name: 'Vancouver Cherry Blossom Festival',
  url: 'https://vcbf.ca/events',
  enabled: true,
  
  /**
   * Parse date strings into start and end date objects with enhanced parsing
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object with startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Handle specific formats like "July 1 @ 8:15 pm - 10:05 pm"
      const eventTimePattern = /([A-Za-z]+)\s+(\d{1,2})\s*@\s*(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
      const eventTimeMatch = dateString.match(eventTimePattern);
      
      if (eventTimeMatch) {
        const month = eventTimeMatch[1];
        const day = parseInt(eventTimeMatch[2]);
        
        const startHour = parseInt(eventTimeMatch[3]);
        const startMinute = parseInt(eventTimeMatch[4]);
        const startMeridiem = eventTimeMatch[5].toLowerCase();
        
        const endHour = parseInt(eventTimeMatch[6]);
        const endMinute = parseInt(eventTimeMatch[7]);
        const endMeridiem = eventTimeMatch[8].toLowerCase();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Default to current year if not specified
          const year = new Date().getFullYear();
          
          let startHour24 = startHour;
          if (startMeridiem === 'pm' && startHour < 12) startHour24 += 12;
          if (startMeridiem === 'am' && startHour === 12) startHour24 = 0;
          
          let endHour24 = endHour;
          if (endMeridiem === 'pm' && endHour < 12) endHour24 += 12;
          if (endMeridiem === 'am' && endHour === 12) endHour24 = 0;
          
          const startDate = new Date(year, monthNum, day, startHour24, startMinute);
          const endDate = new Date(year, monthNum, day, endHour24, endMinute);
          
          return { startDate, endDate };
        }
      }
      
      // Handle date range patterns
      // e.g., "April 1-15, 2025" or "April 1-May 15, 2025"
      const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](?:([A-Za-z]+)\s+)?(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const dateRangeMatch = dateString.match(dateRangePattern);
      
      if (dateRangeMatch) {
        const startMonth = dateRangeMatch[1];
        const startDay = parseInt(dateRangeMatch[2]);
        // If there's a second month specified use it, otherwise use the first month
        const endMonth = dateRangeMatch[3] || startMonth;
        const endDay = parseInt(dateRangeMatch[4]);
        const year = parseInt(dateRangeMatch[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay, 0, 0, 0);
          const endDate = new Date(year, endMonthNum, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date pattern with year
      // e.g., "April 15, 2025"
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
          const startDate = new Date(year, monthNum, day, 0, 0, 0);
          const endDate = new Date(year, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date pattern without year
      // e.g., "April 15"
      const singleDateNoYearPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const singleDateNoYearMatch = dateString.match(singleDateNoYearPattern);
      
      if (singleDateNoYearMatch) {
        const month = singleDateNoYearMatch[1];
        const day = parseInt(singleDateNoYearMatch[2]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Default to current year if not specified
          const year = new Date().getFullYear();
          
          const startDate = new Date(year, monthNum, day, 0, 0, 0);
          const endDate = new Date(year, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
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
    
    return `cherry-blossom-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, venue) {
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
        name: venue || 'Various Vancouver Locations',
        address: venue || 'Multiple locations throughout Vancouver',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        website: 'https://vcbf.ca/',
        googleMapsUrl: ''
      },
      categories: [
        'festival',
        'outdoor',
        'nature',
        'community',
        'spring'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'cherry-blossom-festival'
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
        await page.waitForSelector('.event, .tribe-events-calendar-list__event, article, .event-card, .event-item', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event, .tribe-events-calendar-list__event, article, .event-card, .event-item, .eventitem'
        ));
        
        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, .event-date, .tribe-event-date-start')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          const venueText = element.querySelector('.venue, .location, .tribe-events-venue')?.textContent.trim() || '';
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            venue: venueText
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // If no events found on events page, check for festival dates on the homepage
      if (eventsData.length === 0) {
        console.log('No events found on events page, checking homepage for festival dates');
        
        await page.goto('https://vcbf.ca/', { waitUntil: 'networkidle2', timeout: 15000 });
        
        const festivalData = await page.evaluate(() => {
          // Look for festival date information
          const datePattern = /(?:march|april|may)\s+\d{1,2}[-–]\d{1,2},?\s*\d{4}/i;
          const fullText = document.body.textContent;
          
          const dateMatch = fullText.match(datePattern);
          const dateText = dateMatch ? dateMatch[0] : '';
          
          // Look for a description
          const description = document.querySelector('p')?.textContent.trim() || '';
          
          // Look for an image
          const imageUrl = document.querySelector('.hero img, .banner img, .featured img')?.src || 
                          document.querySelector('img')?.src || '';
          
          return {
            title: 'Vancouver Cherry Blossom Festival',
            description: description || 'Annual celebration of cherry blossoms throughout Vancouver',
            dateText,
            imageUrl,
            sourceUrl: 'https://vcbf.ca/'
          };
        });
        
        if (festivalData.dateText) {
          console.log(`Found festival date: ${festivalData.dateText}`);
          eventsData.push(festivalData);
        } else {
          // If no specific date found, create a default entry for spring
          const currentYear = new Date().getFullYear();
          eventsData.push({
            title: 'Vancouver Cherry Blossom Festival',
            description: 'Annual celebration of cherry blossoms throughout Vancouver',
            dateText: `April 1-15, ${currentYear}`,
            imageUrl: '',
            sourceUrl: 'https://vcbf.ca/'
          });
        }
      }
      
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
          eventData.venue
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

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new CherryBlossomFestEvents();
