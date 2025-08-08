const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Vancouver Fringe Festival Events Scraper
 * Scrapes events from the Vancouver Fringe Festival
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver Fringe Festival Events Scraper
 */
const FringeFestivalEvents = {
  name: 'Vancouver Fringe Festival',
  url: 'https://www.vancouverfringe.com/festival/shows',
  enabled: true,
  
  /**
   * Parse date string into start and end date objects
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
      
      // Handle September 5-15, 2025 format
      const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const dateRangeMatch = dateString.match(dateRangePattern);
      
      if (dateRangeMatch) {
        const month = dateRangeMatch[1];
        const startDay = parseInt(dateRangeMatch[2]);
        const endDay = parseInt(dateRangeMatch[3]);
        const year = parseInt(dateRangeMatch[4]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, startDay);
          startDate.setHours(timeHours, timeMinutes, 0);
          
          const endDate = new Date(year, monthNum, endDay);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing
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
    
    return `fringe-festival-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object
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
        name: venue || 'Vancouver Fringe Festival',
        address: '1398 Cartwright Street',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6H 3R8',
        website: 'https://www.vancouverfringe.com/',
        googleMapsUrl: 'https://goo.gl/maps/SDpJ4N7zKgyxXaS87'
      },
      categories: [
        'arts',
        'theatre',
        'performance',
        'festival',
        'fringe'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'fringe-festival'
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Shorter timeout
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      try {
        await page.waitForSelector('.show-item, .show, .event-card, article', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find show elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract show data
      const showsData = await page.evaluate(() => {
        const shows = [];
        
        // Try different selectors
        const showElements = Array.from(document.querySelectorAll('.show-item, .show, .event-card, article, .performance-item'));
        
        showElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title, .show-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, .show-date, time')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          const venueText = element.querySelector('.venue, .location')?.textContent.trim() || '';
          
          shows.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            venue: venueText
          });
        });
        
        return shows;
      });
      
      console.log(`Found ${showsData.length} potential shows`);
      
      // Process each show data
      for (const showData of showsData) {
        // Parse date information
        const dateInfo = this.parseDateRange(showData.dateText);
        
        // Skip shows with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping show "${showData.title}" due to invalid date: "${showData.dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(showData.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          showData.title,
          showData.description,
          dateInfo.startDate,
          dateInfo.endDate,
          showData.imageUrl,
          showData.sourceUrl,
          showData.venue
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
module.exports = new FringeFestivalEvents();
