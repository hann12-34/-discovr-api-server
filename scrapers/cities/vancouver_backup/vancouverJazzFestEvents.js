const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Vancouver Jazz Festival Events Scraper
 * Scrapes events from the Vancouver International Jazz Festival
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver Jazz Festival Events Scraper
 */
const VancouverJazzFestEvents = {
  name: 'Vancouver International Jazz Festival',
  url: 'https://coastaljazz.ca/festival/',
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
      
      // Look for time pattern
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
      
      // Handle date range patterns
      // e.g., "June 23-July 2, 2025" or "June 23-30, 2025"
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
          const startDate = new Date(year, startMonthNum, startDay);
          startDate.setHours(timeHours, timeMinutes, 0);
          
          const endDate = new Date(year, endMonthNum, endDay);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date pattern
      // e.g., "June 23, 2025"
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
          const startDate = new Date(year, monthNum, day);
          startDate.setHours(timeHours, timeMinutes, 0);
          
          const endDate = new Date(year, monthNum, day);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
        startDate.setHours(timeHours, timeMinutes, 0);
        
        const endDate = new Date(startDate);
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
    
    return `jazz-fest-${slug}-${dateStr}`;
  },
  
  /**
   * Create event object with all required fields
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
        name: venue || 'Vancouver Jazz Festival',
        address: '295 East 1st Avenue',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5T 1A7',
        website: 'https://coastaljazz.ca/',
        googleMapsUrl: 'https://goo.gl/maps/gJ44xZ9xprNEqncs6'
      },
      categories: [
        'music',
        'jazz',
        'festival',
        'concert',
        'performance'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'vancouver-jazz-festival'
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
        await page.waitForSelector('.event, .performance, article, .event-card, .performance-item', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll('.event, .performance, article, .event-card, .performance-item, .lineup-item'));
        
        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, .event-date')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          const venueText = element.querySelector('.venue, .location')?.textContent.trim() || '';
          
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
      
      // If no events found, check festival dates on homepage
      if (eventsData.length === 0) {
        console.log('No events found on events page, checking homepage for festival dates');
        
        await page.goto('https://coastaljazz.ca/', { waitUntil: 'networkidle2', timeout: 15000 });
        
        const festivalData = await page.evaluate(() => {
          // Look for festival date information
          const datePattern = /(?:june|july)\s+\d{1,2}[-–]\d{1,2},?\s*\d{4}/i;
          const fullText = document.body.textContent;
          
          const dateMatch = fullText.match(datePattern);
          const dateText = dateMatch ? dateMatch[0] : '';
          
          // Look for a description
          const description = document.querySelector('p')?.textContent.trim() || '';
          
          // Look for an image
          const imageUrl = document.querySelector('img')?.src || '';
          
          return {
            title: 'Vancouver International Jazz Festival',
            description,
            dateText,
            imageUrl,
            sourceUrl: 'https://coastaljazz.ca/'
          };
        });
        
        if (festivalData.dateText) {
          console.log(`Found festival date: ${festivalData.dateText}`);
          eventsData.push(festivalData);
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
module.exports = new VancouverJazzFestEvents();
