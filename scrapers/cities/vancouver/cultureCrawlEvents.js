/**
 * Eastside Culture Crawl Events Scraper
 * Scrapes events from the Eastside Culture Crawl in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Eastside Culture Crawl Events Scraper
 */
const CultureCrawlEvents = {
  name: 'Eastside Culture Crawl',
  url: 'https://culturecrawl.ca/events',
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
      
      // Date patterns to match
      const patterns = [
        // November 18-21, 2025
        {
          regex: /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i,
          parse: (match) => {
            const month = match[1];
            const startDay = parseInt(match[2]);
            const endDay = parseInt(match[3]);
            const year = parseInt(match[4]);
            
            const months = {
              january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
              april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
              august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
              november: 10, nov: 10, december: 11, dec: 11
            };
            
            const monthNum = months[month.toLowerCase()];
            if (monthNum === undefined) return null;
            
            const startDate = new Date(year, monthNum, startDay);
            const endDate = new Date(year, monthNum, endDay);
            return { startDate, endDate };
          }
        },
        // November 18, 2025
        {
          regex: /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i,
          parse: (match) => {
            const month = match[1];
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            
            const months = {
              january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
              april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
              august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
              november: 10, nov: 10, december: 11, dec: 11
            };
            
            const monthNum = months[month.toLowerCase()];
            if (monthNum === undefined) return null;
            
            const startDate = new Date(year, monthNum, day);
            const endDate = new Date(year, monthNum, day);
            return { startDate, endDate };
          }
        }
      ];
      
      // Try each pattern
      for (const pattern of patterns) {
        const match = dateString.match(pattern.regex);
        if (match) {
          const result = pattern.parse(match);
          if (result) {
            result.startDate.setHours(timeHours, timeMinutes, 0);
            result.endDate.setHours(23, 59, 59);
            return result;
          }
        }
      }
      
      // Try standard date parsing as fallback
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
    
    return `culture-crawl-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, location) {
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
        name: location || 'Eastside Culture Crawl',
        address: '1000 Parker Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6A 2H2',
        website: 'https://culturecrawl.ca/',
        googleMapsUrl: 'https://goo.gl/maps/ZppjKoGjahM7AVfS6'
      },
      categories: [
        'arts',
        'visual-arts',
        'festival',
        'exhibition',
        'community'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'culture-crawl'
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
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Shorter timeout
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      try {
        await page.waitForSelector('.event, .event-item, article, .event-card', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors
        const eventElements = Array.from(document.querySelectorAll('.event, .event-item, article, .event-card, .events-list li'));
        
        eventElements.forEach(element => {
          const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, .event-date, time')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          const locationElement = element.querySelector('.location, .venue');
          const location = locationElement ? locationElement.textContent.trim() : '';
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            location
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // If no events found on main page, check for any festival dates on the homepage
      if (eventsData.length === 0) {
        console.log('No events found on events page, checking homepage for festival dates');
        
        await page.goto('https://culturecrawl.ca/', { waitUntil: 'networkidle2', timeout: 15000 });
        
        const festivalData = await page.evaluate(() => {
          // Look for festival date information
          const datePattern = /(?:november|nov)\s+\d{1,2}[-–]\d{1,2},?\s*\d{4}/i;
          const fullText = document.body.textContent;
          
          const dateMatch = fullText.match(datePattern);
          const dateText = dateMatch ? dateMatch[0] : '';
          
          // Look for a description
          const description = document.querySelector('p')?.textContent.trim() || '';
          
          // Look for an image
          const imageUrl = document.querySelector('img')?.src || '';
          
          return {
            title: 'Eastside Culture Crawl Festival',
            description,
            dateText,
            imageUrl,
            sourceUrl: 'https://culturecrawl.ca/'
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
          eventData.location
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

module.exports = CultureCrawlEvents;
