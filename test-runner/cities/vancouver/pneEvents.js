/**
 * PNE (Pacific National Exhibition) Events Scraper
 * Scrapes events from the PNE in Vancouver
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Use stealth plugin to prevent detection
puppeteer.use(StealthPlugin());

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
      
      // Handle format like "July 5 @ 6:00pm - 10:00pm" (with day and time range)
      const eventDateTimePattern = /([A-Za-z]+)\s+(\d{1,2})\s*@\s*(\d{1,2}):?(\d{2})?(am|pm)?\s*-\s*(\d{1,2}):?(\d{2})?(am|pm)?/i;
      const eventDateTimeMatch = dateString.match(eventDateTimePattern);
      
      if (eventDateTimeMatch) {
        const month = eventDateTimeMatch[1];
        const day = parseInt(eventDateTimeMatch[2]);
        const startHour = parseInt(eventDateTimeMatch[3]);
        const startMinute = eventDateTimeMatch[4] ? parseInt(eventDateTimeMatch[4]) : 0;
        const startAmPm = eventDateTimeMatch[5] ? eventDateTimeMatch[5].toLowerCase() : 'pm';
        const endHour = parseInt(eventDateTimeMatch[6]);
        const endMinute = eventDateTimeMatch[7] ? parseInt(eventDateTimeMatch[7]) : 0;
        const endAmPm = eventDateTimeMatch[8] ? eventDateTimeMatch[8].toLowerCase() : 'pm';
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        const year = new Date().getFullYear();
        
        if (monthNum !== undefined) {
          let startHours = startHour;
          if (startAmPm === 'pm' && startHours < 12) startHours += 12;
          if (startAmPm === 'am' && startHours === 12) startHours = 0;
          
          let endHours = endHour;
          if (endAmPm === 'pm' && endHours < 12) endHours += 12;
          if (endAmPm === 'am' && endHours === 12) endHours = 0;
          
          const startDate = new Date(year, monthNum, day, startHours, startMinute);
          const endDate = new Date(year, monthNum, day, endHours, endMinute);
          
          return { startDate, endDate };
        }
      }
      
      // Handle time-only format like "5:00pm" or "12:00pm" (assumes today's date)
      const timeOnlyPattern = /^(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)$/i;
      const timeOnlyMatch = dateString.match(timeOnlyPattern);
      
      if (timeOnlyMatch) {
        const hours = parseInt(timeOnlyMatch[1]);
        const minutes = timeOnlyMatch[2] ? parseInt(timeOnlyMatch[2]) : 0;
        const isPM = timeOnlyMatch[3].toLowerCase() === 'pm';
        
        const today = new Date(); // Use today's date
        let eventHours = hours;
        
        // Convert to 24-hour format
        if (isPM && eventHours < 12) eventHours += 12;
        if (!isPM && eventHours === 12) eventHours = 0;
        
        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), eventHours, minutes);
        
        // For events, end time is typically 3 hours after start time
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
      
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
      
      // Last resort: Try to find any date or time information in the string
      // If there's a month name and day number, use that with current year
      const looseMonthDayPattern = /([A-Za-z]+)\s+(\d{1,2})/i;
      const looseMonthDayMatch = dateString.match(looseMonthDayPattern);
      
      if (looseMonthDayMatch) {
        const month = looseMonthDayMatch[1];
        const day = parseInt(looseMonthDayMatch[2]);
        const year = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, day, 19, 0); // Default to 7 PM
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
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
          console.warn('No PNE Fair date found on the website. Skipping this event.');
          // Save debug info for troubleshooting
          await this._saveDebugInfo(page, 'pne_fair_no_date');
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
  },
  
  /**
   * Save debugging information
   * @param {Page} page - Puppeteer page object
   * @param {string} prefix - Prefix for debug files
   */
  async _saveDebugInfo(page, prefix) {
    try {
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      const debugDir = path.join(__dirname, 'debug');
      
      // Create debug directory if it doesn't exist
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save screenshot
      const screenshotPath = path.join(debugDir, `${prefix}_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML content
      const htmlContent = await page.content();
      const htmlPath = path.join(debugDir, `${prefix}_${timestamp}.html`);
      fs.writeFileSync(htmlPath, htmlContent);
      
      console.log(`Debug artifacts saved to ${debugDir}`);
    } catch (error) {
      console.error(`Error saving debug info: ${error.message}`);
    }
  }
};

module.exports = PNEEvents;
