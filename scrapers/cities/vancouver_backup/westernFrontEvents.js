const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Western Front Gallery Events Scraper
 * Scrapes events from Western Front Gallery in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Western Front Gallery Events Scraper Class
 */
const WesternFrontEvents = {
  name: 'Western Front Gallery',
  url: 'https://westernfront.ca/events/',
  enabled: true,

  /**
   * Parse a date range string into start and end date objects
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object containing startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };

    try {
      console.log(`Parsing date: "${dateString}"`);
      dateString = dateString.trim();
      
      // Common date formats
      // "January 15 - February 20, 2025"
      // "July 5, 2025"
      // "July 5–6, 2025"
      // "Jul 5 – Jul 15, 2025"
      // "2025-07-15"
      
      // For ISO format dates
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
      
      // Extract year first
      let year = new Date().getFullYear();
      const yearMatch = dateString.match(/(20[2-9][0-9])/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
      
      // Format: "Month Day - Month Day, Year" or "Month Day - Day, Year"
      const longFormatMatch = dateString.match(/([A-Za-z]+)\s+(\d{1,2})(?:\s*[–—-]\s*(?:([A-Za-z]+)\s+)?(\d{1,2}))?,?\s*(?:20[2-9][0-9])?/);
      
      if (longFormatMatch) {
        const startMonth = longFormatMatch[1];
        const startDay = parseInt(longFormatMatch[2]);
        const endMonth = longFormatMatch[3] || startMonth;
        const endDay = longFormatMatch[4] ? parseInt(longFormatMatch[4]) : startDay;
        
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
          
          // If end date is before start date, try next year for end date
          if (endDate < startDate) {
            endDate.setFullYear(year + 1);
          }
          
          return { startDate, endDate };
        }
      }
      
      // If specific format parsing fails, try with Date.parse as fallback
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        return { startDate: date, endDate: endDate };
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
    
    // Generate a slug from the title
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `western-front-gallery-${slug}-${dateStr}`;
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
        name: 'Western Front Gallery',
        address: '303 East 8th Avenue',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5T 1S1',
        website: 'https://westernfront.ca/',
        googleMapsUrl: 'https://goo.gl/maps/DEikLRWdC4hXXQ9Y6'
      },
      categories: [
        'arts',
        'gallery',
        'exhibition',
        'cultural',
        'contemporary'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'western-front-gallery'
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
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--ignore-certificate-errors',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      
      // Extract events from the main page
      const mainPageEvents = await page.evaluate(() => {
        const events = [];
        
        // Look for event containers
        const eventContainers = Array.from(document.querySelectorAll('.event-item, .event-card, .event-listing, article, .grid-item'));
        
        eventContainers.forEach(container => {
          const title = container.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = container.querySelector('p, .description, .excerpt, .event-description')?.textContent.trim() || '';
          const dateText = container.querySelector('.date, .event-date, time, .datetime, .date-display')?.textContent.trim() || '';
          const imageUrl = container.querySelector('img')?.src || '';
          const linkElement = container.querySelector('a[href]');
          const link = linkElement ? new URL(linkElement.href, window.location.href).href : '';
          
          if (title) {
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              link
            });
          }
        });
        
        return events;
      });
      
      // Process each main page event
      for (const eventData of mainPageEvents) {
        const { title, description, dateText, imageUrl, link } = eventData;
        
        // Parse date information
        const dateInfo = this.parseDateRange(dateText);
        
        // Skip events with no dates
        if (!dateInfo.startDate && !dateInfo.endDate) {
          console.log(`Skipping event "${title}" due to missing or invalid date: "${dateText}"`);
          continue;
        }
        
        // Generate event ID and create event object
        const eventId = this.generateEventId(title, dateInfo.startDate);
        
        const event = this.createEventObject(
          eventId,
          title,
          description,
          dateInfo.startDate,
          dateInfo.endDate,
          imageUrl,
          link || this.url
        );
        
        events.push(event);
      }
      
      // If no events found on main page, try to find event links and follow them
      if (events.length === 0) {
        const eventLinks = await page.evaluate(() => {
          const links = [];
          const allLinks = Array.from(document.querySelectorAll('a[href]'));
          
          for (const link of allLinks) {
            const href = link.href;
            if (href.includes('/event/') || href.includes('/events/') || href.includes('/exhibition/')) {
              links.push(href);
            }
          }
          
          return [...new Set(links)]; // Return unique links
        });
        
        // Visit up to 5 event detail pages
        for (const link of eventLinks.slice(0, 5)) {
          console.log(`Visiting event page: ${link}`);
          await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
          
          const eventData = await page.evaluate(() => {
            const title = document.querySelector('h1, h2, .title, .event-title')?.textContent.trim() || '';
            const description = document.querySelector('.description, .content, article p')?.textContent.trim() || '';
            const dateText = document.querySelector('.date, .event-date, time, .datetime')?.textContent.trim() || '';
            const imageUrl = document.querySelector('.featured-image img, .event-image img')?.src || '';
            
            return {
              title,
              description,
              dateText,
              imageUrl,
              link: window.location.href
            };
          });
          
          if (!eventData.title) continue;
          
          // Parse date information
          const dateInfo = this.parseDateRange(eventData.dateText);
          
          // Skip events with no dates
          if (!dateInfo.startDate && !dateInfo.endDate) {
            console.log(`Skipping event "${eventData.title}" due to missing or invalid date: "${eventData.dateText}"`);
            continue;
          }
          
          // Generate event ID and create event object
          const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
          
          const event = this.createEventObject(
            eventId,
            eventData.title,
            eventData.description,
            dateInfo.startDate,
            dateInfo.endDate,
            eventData.imageUrl,
            eventData.link
          );
          
          events.push(event);
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

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new WesternFrontEvents();
