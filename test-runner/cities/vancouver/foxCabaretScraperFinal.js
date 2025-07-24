/**
 * Fox Cabaret Events Scraper (Final Version)
 * Scrapes events from Fox Cabaret in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fox Cabaret Events Scraper
 */
const FoxCabaretScraper = {
  name: 'Fox Cabaret',
  url: 'https://www.foxcabaret.com/',
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
      
      // Look for time pattern and extract
      let timeHours = 19; // Default to 7pm for concerts if no time specified
      let timeMinutes = 0;
      const timeMatch = dateString.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
      
      if (timeMatch) {
        timeHours = parseInt(timeMatch[1]);
        timeMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && timeHours < 12) timeHours += 12;
        if (!isPM && timeHours === 12) timeHours = 0;
      }
      
      // Match full date with year like "January 15, 2025"
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
          const startDate = new Date(year, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(year, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match short date like "January 15" for current year
      const shortDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const shortDateMatch = dateString.match(shortDatePattern);
      
      if (shortDateMatch) {
        const month = shortDateMatch[1];
        const day = parseInt(shortDateMatch[2]);
        const currentYear = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(currentYear, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(currentYear, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match date in MM/DD/YYYY format
      const numericDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
      const numericMatch = dateString.match(numericDatePattern);
      
      if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1; // JS months are 0-indexed
        const day = parseInt(numericMatch[2]);
        const year = parseInt(numericMatch[3]);
        
        const startDate = new Date(year, month, day, timeHours, timeMinutes);
        const endDate = new Date(year, month, day, 23, 59, 59);
        
        return { startDate, endDate };
      }
      
      // Match day and month format like "15 July"
      const dayFirstPattern = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i;
      const dayFirstMatch = dateString.match(dayFirstPattern);
      
      if (dayFirstMatch) {
        const day = parseInt(dayFirstMatch[1]);
        const month = dayFirstMatch[2];
        const currentYear = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(currentYear, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(currentYear, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parse as fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = parsedDate;
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
    } else {
      // If no date, use a timestamp to ensure uniqueness
      dateStr = new Date().toISOString().split('T')[0];
    }
    
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `fox-cabaret-${slug}-${dateStr}`;
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
        name: 'Fox Cabaret',
        address: '2321 Main St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5T 3C9',
        website: 'https://www.foxcabaret.com/',
        googleMapsUrl: 'https://maps.app.goo.gl/fPzcZZLFZJfzBLLY9'
      },
      categories: [
        'arts',
        'music',
        'performance',
        'concert'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'fox-cabaret'
    };
  },
  
  /**
   * Helper to sleep for a specified time
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after timeout
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const eventMap = new Map(); // For deduplication
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Increase timeout to avoid hanging
      page.setDefaultNavigationTimeout(60000);
      
      // Navigate to the main homepage which has events
      console.log(`Navigating to events page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000
      });
      
      // Check for "See More" buttons or pagination links to load more events
      try {
        const hasMoreEventsButton = await page.evaluate(() => {
          const moreButtons = Array.from(document.querySelectorAll('a, button')).filter(el => {
            const text = el.textContent.toLowerCase();
            return text.includes('more events') || text.includes('view more') || 
                   text.includes('see all') || text.includes('load more');
          });
          return moreButtons.length > 0 ? moreButtons[0].href || moreButtons[0].outerHTML : null;
        });
        
        if (hasMoreEventsButton) {
          console.log('Found a "More Events" button, attempting to navigate...');
          await Promise.all([
            page.evaluate(() => {
              const moreButtons = Array.from(document.querySelectorAll('a, button')).filter(el => {
                const text = el.textContent.toLowerCase();
                return text.includes('more events') || text.includes('view more') || 
                       text.includes('see all') || text.includes('load more');
              });
              if (moreButtons.length > 0) moreButtons[0].click();
            }),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('Navigation after clicking "More Events" timed out, continuing...'))  
          ]);
        }
      } catch (error) {
        console.log('Error checking for more events buttons:', error.message);
      }
      
      // Create debug directory if needed
      const debugDir = path.join(__dirname, '..', '..', 'debug');
      try {
        await fs.mkdir(debugDir, { recursive: true });
      } catch (error) {
        console.error(`Error creating debug directory: ${error.message}`);
      }
      
      // Save debug screenshot and HTML
      const timestamp = new Date().getTime();
      await page.screenshot({ path: path.join(debugDir, `fox-cabaret-${timestamp}.png`) });
      const html = await page.content();
      await fs.writeFile(path.join(debugDir, `fox-cabaret-${timestamp}.html`), html);
      
      console.log('Extracting event data...');
      
      // Extract events using the actual event elements from the home page
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Find summary-item elements which contain events
        const eventItems = document.querySelectorAll('.summary-item-record-type-event');
        
        console.log(`Found ${eventItems.length} event elements`);
        
        eventItems.forEach(item => {
          try {
            // Extract title
            const titleElement = item.querySelector('.summary-title a');
            if (!titleElement) return;
            
            const title = titleElement.textContent.trim();
            if (!title) return;
            
            // Extract source URL
            const sourceUrl = titleElement.href;
            
            // Extract date - Fox Cabaret has a specific event date box structure
            let month = '';
            let day = '';
            
            const monthElement = item.querySelector('.summary-thumbnail-event-date-month');
            if (monthElement) {
              month = monthElement.textContent.trim();
            }
            
            const dayElement = item.querySelector('.summary-thumbnail-event-date-day');
            if (dayElement) {
              day = dayElement.textContent.trim();
            }
            
            // Extract time
            let time = '';
            const timeElement = item.querySelector('.summary-metadata-item--event-time .event-time-12hr');
            if (timeElement) {
              time = timeElement.textContent.trim();
            }
            
            // Combine date and time
            const dateText = month && day ? `${month} ${day} ${time}` : '';
            
            // Extract description
            let description = '';
            const descElement = item.querySelector('.summary-excerpt');
            if (descElement) {
              description = descElement.textContent.trim();
            }
            
            // Extract image
            let imageUrl = '';
            const imageElement = item.querySelector('.summary-thumbnail-image');
            if (imageElement && imageElement.dataset.image) {
              imageUrl = imageElement.dataset.image;
            }
            
            // Add to events array
            events.push({
              title,
              dateText,
              description,
              imageUrl,
              sourceUrl
            });
          } catch (e) {
            // Skip any events that cause errors during extraction
            console.error('Error extracting event:', e);
          }
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      const currentYear = new Date().getFullYear();
      
      // Process events
      for (const eventData of eventsData) {
        // Skip events without titles
        if (!eventData.title) {
          console.log('Skipping event with no title');
          continue;
        }
        
        console.log(`Processing event: ${eventData.title}`);
        
        // Add current year to dateText since the Fox Cabaret date format only has month and day
        const fullDateText = `${eventData.dateText}, ${currentYear}`;
        
        // Parse date
        let dateInfo = this.parseDateRange(fullDateText);
        
        // If date is in the past, it might be for next year
        if (dateInfo.startDate && dateInfo.startDate < new Date()) {
          console.log(`Date is in the past, adjusting to next year: ${dateInfo.startDate}`);
          dateInfo.startDate.setFullYear(currentYear + 1);
          dateInfo.endDate.setFullYear(currentYear + 1);
        }
        
        // If we can't parse a date, use current date as fallback for start date
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Warning: Event "${eventData.title}" has invalid date: "${eventData.dateText}". Using current date.`);
          dateInfo.startDate = new Date();
          dateInfo.endDate = new Date();
          dateInfo.endDate.setHours(23, 59, 59);
        }
        
        // Generate ID
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
        
        // Use a composite key of title + date for deduplication
        const eventKey = `${event.title}|${event.startDate ? event.startDate.toISOString() : ''}`;
        if (!eventMap.has(eventKey)) {
          eventMap.set(eventKey, event);
          events.push(event);
        }
      }
      
      console.log(`Successfully processed ${events.length} unique events from ${this.name}`);
      
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

module.exports = FoxCabaretScraper;
