const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Biltmore Cabaret Events Scraper
 * Scrapes events from The Biltmore Cabaret in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Biltmore Cabaret Events Scraper
 */
const BiltmoreCabaretEvents = {
  name: 'The Biltmore Cabaret',
  url: 'https://www.biltmorecabaret.com/events/',
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
      
      // Format: "Monday, July 7th" or "Monday July 7"
      const dayMonthPattern = /(?:([A-Za-z]+),?\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const dayMonthMatch = dateString.match(dayMonthPattern);
      
      if (dayMonthMatch) {
        const month = dayMonthMatch[2];
        const day = parseInt(dayMonthMatch[3]);
        
        // Default to current year
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Check for time information
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
          const timeMatch = dateString.match(timePattern);
          
          let hours = 21; // Default to 9 PM for concerts at Biltmore
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
          
          const startDate = new Date(year, monthNum, day, hours, minutes, 0);
          
          // Check if the date is in the past, if so, set it to next year
          if (startDate < currentDate && monthNum < currentDate.getMonth()) {
            startDate.setFullYear(year + 1);
          }
          
          // End time is typically 3 hours after start for concerts
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Format: "July 7, 2025" or "July 7 2025"
      const monthDayYearPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const monthDayYearMatch = dateString.match(monthDayYearPattern);
      
      if (monthDayYearMatch) {
        const month = monthDayYearMatch[1];
        const day = parseInt(monthDayYearMatch[2]);
        const year = parseInt(monthDayYearMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Check for time information
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
          const timeMatch = dateString.match(timePattern);
          
          let hours = 21; // Default to 9 PM for concerts at Biltmore
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
          
          const startDate = new Date(year, monthNum, day, hours, minutes, 0);
          
          // End time is typically 3 hours after start for concerts
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Format: "7/7/2025" or "7-7-2025"
      const numericDatePattern = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/;
      const numericDateMatch = dateString.match(numericDatePattern);
      
      if (numericDateMatch) {
        let month = parseInt(numericDateMatch[1]) - 1; // 0-indexed month
        const day = parseInt(numericDateMatch[2]);
        let year = parseInt(numericDateMatch[3]);
        
        // Fix 2-digit year
        if (year < 100) {
          year += 2000; // Assuming all dates are in the 21st century
        }
        
        // Check for time information
        const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
        const timeMatch = dateString.match(timePattern);
        
        let hours = 21; // Default to 9 PM for concerts at Biltmore
        let minutes = 0;
        
        if (timeMatch) {
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          
          // Convert to 24-hour format
          const isPM = timeMatch[3].toLowerCase() === 'pm';
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        const startDate = new Date(year, month, day, hours, minutes, 0);
        
        // End time is typically 3 hours after start for concerts
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
        
        // Default to 9 PM for concerts if time not specified
        const hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/);
        if (!hasTimeInfo) {
          startDate.setHours(21, 0, 0);
        }
        
        // End time is typically 3 hours after start for concerts
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
    
    return `biltmore-${slug}-${dateStr}`;
  },
  
  /**
   * Extract price information from text
   * @param {string} text - Text containing price information
   * @returns {string} - Formatted price string or empty string if not found
   */
  extractPrice(text) {
    if (!text) return '';
    
    const pricePattern = /\$\d+(?:\.\d{2})?(?:\s*-\s*\$\d+(?:\.\d{2})?)?/g;
    const matches = text.match(pricePattern);
    
    if (matches && matches.length > 0) {
      // Return the first price found
      return matches[0];
    }
    
    return '';
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, price) {
    // Try to determine musical genre from description or title
    let categories = ['music', 'concert', 'nightlife', 'entertainment'];
    
    const genreKeywords = {
      'rock': ['rock', 'punk', 'metal', 'indie', 'alternative'],
      'electronic': ['electronic', 'edm', 'techno', 'house', 'dj', 'dance'],
      'hip-hop': ['hip hop', 'hip-hop', 'rap', 'r&b', 'rnb'],
      'jazz': ['jazz', 'blues'],
      'folk': ['folk', 'acoustic', 'singer-songwriter'],
      'pop': ['pop', 'synth']
    };
    
    const fullText = (title + ' ' + description).toLowerCase();
    
    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          categories.push(genre);
          break;
        }
      }
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
      price: price || '',
      venue: {
        name: 'The Biltmore Cabaret',
        address: '2755 Prince Edward St',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5T 0A9',
        website: 'https://www.biltmorecabaret.com/',
        googleMapsUrl: 'https://goo.gl/maps/p7hb1TE5S83JWz6D7'
      },
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'biltmore-cabaret'
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
        await page.waitForSelector('.event-listing, .event, .event-item, .eventitem', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event-listing, .event, .event-item, .eventitem, article'
        ));
        
        eventElements.forEach(element => {
          const title = element.querySelector('.title, h2, h3, h4, .event-name, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('.description, p, .event-description, .excerpt')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, time, .event-date, .datetime')?.textContent.trim() || '';
          const imageUrl = element.querySelector('img')?.src || '';
          const sourceUrl = element.querySelector('a[href]')?.href || '';
          
          // Try to extract price information
          let priceText = '';
          const priceElement = element.querySelector('.price, .ticket-price, .cost');
          if (priceElement) {
            priceText = priceElement.textContent.trim();
          } else {
            // Try to find price in description
            const priceMatch = description.match(/\$\d+/);
            if (priceMatch) {
              priceText = priceMatch[0];
            }
          }
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            priceText
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
        
        // Extract price
        const price = this.extractPrice(eventData.priceText);
        
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
          price
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
module.exports = new BiltmoreCabaretEvents();
