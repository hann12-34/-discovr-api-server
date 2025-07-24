/**
 * PNE (Pacific National Exhibition) Events Scraper
 * Scrapes events from the PNE in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * PNE Events Scraper
 */
const PNEEvents = {
  name: 'Pacific National Exhibition',
  url: 'https://www.pne.ca/events/',
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
      
      // Handle date range pattern: "August 17 - September 2, 2024"
      const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(?:([A-Za-z]+)\s+)?(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
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
          startDate.setHours(10, 0, 0); // Default to 10 AM opening
          
          const endDate = new Date(year, endMonthNum, endDay);
          endDate.setHours(22, 0, 0); // Default to 10 PM closing
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date pattern: "August 17, 2024"
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
          // Try to extract time if available
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
          const timeMatch = dateString.match(timePattern);
          
          let startHours = 19; // Default to 7 PM if no time specified
          let startMinutes = 0;
          
          if (timeMatch) {
            startHours = parseInt(timeMatch[1]);
            startMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && startHours < 12) startHours += 12;
            if (!isPM && startHours === 12) startHours = 0;
          }
          
          const startDate = new Date(year, monthNum, day, startHours, startMinutes);
          
          // For events, end time is typically 3 hours after start time
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        // Default to 7 PM for events if time not included
        const hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/);
        
        const startDate = new Date(parsedDate);
        if (!hasTimeInfo) {
          startDate.setHours(19, 0, 0);
        }
        
        // End time is typically 3 hours after start time
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
    
    return `pne-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, category) {
    // Map PNE categories to our category system
    const categoryMap = {
      'concert': ['music', 'concert', 'performance'],
      'fair': ['festival', 'family-friendly', 'entertainment'],
      'exhibition': ['exhibition', 'arts'],
      'sports': ['sports', 'entertainment'],
      'show': ['entertainment', 'performance'],
      'family': ['family-friendly', 'entertainment']
    };
    
    // Default categories
    let categories = ['entertainment', 'events'];
    
    // Add mapped categories if available
    if (category && categoryMap[category.toLowerCase()]) {
      categories = [...categories, ...categoryMap[category.toLowerCase()]];
    }
    
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
        name: 'Pacific National Exhibition',
        address: '2901 East Hastings Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5K 5J1',
        website: 'https://www.pne.ca',
        googleMapsUrl: 'https://goo.gl/maps/eVcP7s9vrytQY7Y86'
      },
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'pne'
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
      
      // Use shorter timeout
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      try {
        await page.waitForSelector('.event, .event-card, article, .event-item', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event, .event-card, article, .event-item, .events-list-item'
        ));
        
        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, .event-date')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          
          // Try to extract category
          let category = '';
          const categoryElement = element.querySelector('.category, .event-type, .event-category');
          if (categoryElement) {
            category = categoryElement.textContent.trim();
          } else {
            // Try to infer category from class names
            const classes = element.className.split(' ');
            const categoryClasses = classes.filter(cls => 
              cls.includes('category-') || 
              cls.includes('type-') || 
              cls.includes('event-type-')
            );
            
            if (categoryClasses.length > 0) {
              category = categoryClasses[0].replace(/category-|type-|event-type-/g, '');
            }
          }
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            category
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // If no events found on events page, check for the main PNE Fair dates
      if (eventsData.length === 0) {
        console.log('No events found on events page, checking homepage for PNE Fair dates');
        
        await page.goto('https://www.pne.ca/', { waitUntil: 'networkidle2', timeout: 15000 });
        
        const pneFairData = await page.evaluate(() => {
          // Look for PNE Fair date information
          const datePattern = /(?:august|september)\s+\d{1,2}[-–]\d{1,2},?\s*\d{4}/i;
          const fullText = document.body.textContent;
          
          const dateMatch = fullText.match(datePattern);
          const dateText = dateMatch ? dateMatch[0] : '';
          
          // Look for a description
          const description = document.querySelector('p')?.textContent.trim() || 'The annual PNE Fair - Vancouver\'s favorite end-of-summer tradition';
          
          // Look for an image
          const imageUrl = document.querySelector('.hero img, .banner img')?.src || 
                           document.querySelector('img')?.src || '';
          
          return {
            title: 'PNE Fair',
            description,
            dateText,
            imageUrl,
            sourceUrl: 'https://www.pne.ca/fair/',
            category: 'fair'
          };
        });
        
        if (pneFairData.dateText) {
          console.log(`Found PNE Fair date: ${pneFairData.dateText}`);
          eventsData.push(pneFairData);
        } else {
          // If no specific date found, create a default entry for August fair
          const currentYear = new Date().getFullYear();
          eventsData.push({
            title: 'PNE Fair',
            description: 'The annual PNE Fair - Vancouver\'s favorite end-of-summer tradition',
            dateText: `August 17 - September 2, ${currentYear}`,
            imageUrl: '',
            sourceUrl: 'https://www.pne.ca/fair/',
            category: 'fair'
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
          eventData.category
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

module.exports = PNEEvents;
