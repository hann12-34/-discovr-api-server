/**
 * Vancouver Maritime Museum Events Scraper
 * Scrapes events from the Vancouver Maritime Museum
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver Maritime Museum Events Scraper
 */
const MaritimeMuseumEvents = {
  name: 'Vancouver Maritime Museum',
  url: 'https://vanmaritime.com/whats-on/',
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
      
      // Check for date range format with hyphen (e.g., July 1 - August 15, 2025)
      const dateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*)([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const dateRangeMatch = dateString.match(dateRangePattern);
      
      if (dateRangeMatch) {
        const startMonth = dateRangeMatch[1];
        const startDay = parseInt(dateRangeMatch[2]);
        const endMonth = dateRangeMatch[3];
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
      
      // Check for same month date range (e.g., July 1-15, 2025)
      const sameMonthRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*)(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const sameMonthRangeMatch = dateString.match(sameMonthRangePattern);
      
      if (sameMonthRangeMatch) {
        const month = sameMonthRangeMatch[1];
        const startDay = parseInt(sameMonthRangeMatch[2]);
        const endDay = parseInt(sameMonthRangeMatch[3]);
        const year = parseInt(sameMonthRangeMatch[4]);
        
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
      
      // Check for full date with year (e.g., July 15, 2025)
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
          const startDate = new Date(year, monthNum, day);
          startDate.setHours(timeHours, timeMinutes, 0);
          
          const endDate = new Date(year, monthNum, day);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Check for short date (month and day, assume current year)
      const shortDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const shortDateMatch = dateString.match(shortDatePattern);
      
      if (shortDateMatch) {
        const month = shortDateMatch[1];
        const day = parseInt(shortDateMatch[2]);
        const year = new Date().getFullYear();
        
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
      
      // Check for ISO date format (YYYY-MM-DD)
      if (/\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const isoMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
          const date = new Date(isoMatch[1]);
          if (!isNaN(date.getTime())) {
            const startDate = new Date(date);
            startDate.setHours(timeHours, timeMinutes, 0);
            
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59);
            
            return { startDate, endDate };
          }
        }
      }
      
      // Try numeric date formats (MM/DD/YYYY)
      const numericDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
      const numericMatch = dateString.match(numericDatePattern);
      
      if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1; // JS months are 0-indexed
        const day = parseInt(numericMatch[2]);
        const year = parseInt(numericMatch[3]);
        
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          const startDate = new Date(date);
          startDate.setHours(timeHours, timeMinutes, 0);
          
          const endDate = new Date(date);
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try to parse as a standard date string
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
        startDate.setHours(timeHours, timeMinutes, 0);
        
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
    
    return `maritime-museum-${slug}-${dateStr}`;
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
        name: 'Vancouver Maritime Museum',
        address: '1905 Ogden Avenue',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6J 1A3',
        website: 'https://vanmaritime.com/',
        googleMapsUrl: 'https://goo.gl/maps/Sq7j7YSgZqiyY2C19'
      },
      categories: [
        'museum',
        'maritime',
        'exhibition',
        'history'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'maritime-museum'
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
      
      // Set shorter timeout to avoid hanging
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      try {
        await page.waitForSelector('.event-item, .event-card, .event, article, .event-list-item', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying alternative selectors');
        try {
          // Try alternative selectors
          await page.waitForSelector('.program-item, .exhibition, .card, .program-card', { timeout: 5000 });
        } catch (error) {
          console.log('Could not find event elements with alternative selectors either, continuing anyway');
        }
      }
      
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try various selectors that might contain event information
        const selectors = [
          '.event-item, .event-card, .event, article, .event-list-item',
          '.program-item, .exhibition, .card, .program-card',
          '.whats-on-item, .calendar-item'
        ];
        
        let eventElements = [];
        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          if (elements.length > 0) {
            eventElements = elements;
            break;
          }
        }
        
        // If no specific event elements found, try to look for heading-based content
        if (eventElements.length === 0) {
          const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
          for (const heading of headings) {
            // Skip navigation or menu headings
            if (heading.closest('nav, .menu, .navigation, header, footer')) continue;
            
            const title = heading.textContent.trim();
            if (!title) continue;
            
            // Find description near the heading
            let description = '';
            let descElement = heading.nextElementSibling;
            while (descElement && (descElement.tagName === 'P' || descElement.tagName === 'DIV')) {
              description += ' ' + descElement.textContent.trim();
              descElement = descElement.nextElementSibling;
            }
            
            // Look for date text near the heading
            let dateText = '';
            let dateElement = heading.parentElement.querySelector('time, .date, .datetime');
            if (!dateElement) {
              // Look in siblings or parent for date text
              const parentElement = heading.parentElement;
              const siblings = Array.from(parentElement.children);
              
              for (const sibling of siblings) {
                const text = sibling.textContent.trim();
                if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) || 
                    /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) ||
                    /\d{4}-\d{2}-\d{2}/.test(text)) {
                  dateText = text;
                  break;
                }
              }
            } else {
              dateText = dateElement.textContent.trim();
            }
            
            // Try to find an image near the heading
            let imageUrl = '';
            let imgElement = heading.parentElement.querySelector('img');
            if (imgElement) {
              imageUrl = imgElement.src;
            }
            
            // Try to find a link near the heading
            let sourceUrl = '';
            let linkElement = heading.closest('a');
            if (!linkElement) {
              linkElement = heading.parentElement.querySelector('a[href]');
            }
            if (linkElement) {
              sourceUrl = linkElement.href;
            }
            
            if (title) {
              events.push({
                title,
                description: description.trim(),
                dateText,
                imageUrl,
                sourceUrl
              });
            }
          }
        } else {
          // Process standard event elements
          eventElements.forEach(element => {
            const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
            if (!title) return;
            
            const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
            const dateText = element.querySelector('time, .date, .event-date, .datetime')?.textContent.trim() || '';
            const imageUrl = element.querySelector('img')?.src || '';
            const sourceUrl = element.querySelector('a[href]')?.href || '';
            
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl
            });
          });
        }
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event data to create event objects
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

module.exports = MaritimeMuseumEvents;
