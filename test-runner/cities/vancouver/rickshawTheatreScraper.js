/**
 * Rickshaw Theatre Events Scraper
 * Scrapes events from The Rickshaw Theatre in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Rickshaw Theatre Events Scraper
 */
const RickshawTheatreScraper = {
  name: 'Rickshaw Theatre',
  url: 'https://www.rickshawtheatre.com/',
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
    }
    
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `rickshaw-theatre-${slug}-${dateStr}`;
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
        name: 'Rickshaw Theatre',
        address: '254 E Hastings St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6A 1P1',
        website: 'https://www.rickshawtheatre.com/',
        googleMapsUrl: 'https://maps.app.goo.gl/D1iRpj3J9MFa79AEA'
      },
      categories: [
        'arts',
        'music',
        'performance',
        'concert'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'rickshaw-theatre'
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
      
      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(30000);
      
      // Navigate to the events page
      console.log(`Navigating to events page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Wait for events to load
      try {
        await page.waitForSelector('.event-list-item, .event, .event-preview', { timeout: 10000 });
      } catch (error) {
        console.log('Could not find standard event selectors, trying alternative selectors');
        
        // Try alternative selectors
        try {
          await page.waitForSelector('.single-event, article, .show-item', { timeout: 5000 });
        } catch (error) {
          console.log('Could not find alternative event selectors either');
        }
      }
      
      // Extract events using page.evaluate
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Look for event elements with various potential selectors
        const selectors = [
          '.event-list-item', 
          '.event', 
          '.event-preview',
          '.single-event',
          'article',
          '.show-item',
          '.event-card'
        ];
        
        let eventElements = [];
        
        // Try each selector
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            eventElements = Array.from(elements);
            break;
          }
        }
        
        // If standard selectors didn't work, try a more generic approach
        if (eventElements.length === 0) {
          // Look for any elements containing event information
          const allDivs = document.querySelectorAll('div');
          eventElements = Array.from(allDivs).filter(div => {
            const text = div.textContent.toLowerCase();
            return (text.includes('tickets') || text.includes('concert') || text.includes('show')) && 
                   (text.includes('date') || text.includes('pm') || text.includes('am'));
          });
        }
        
        // Extract event information
        eventElements.forEach(element => {
          // Extract title
          const titleSelectors = ['h2', 'h3', 'h4', '.event-title', '.title', 'strong'];
          let title = '';
          
          for (const selector of titleSelectors) {
            const titleElement = element.querySelector(selector);
            if (titleElement) {
              title = titleElement.textContent.trim();
              break;
            }
          }
          
          // Skip if no title found
          if (!title) return;
          
          // Extract date
          const dateSelectors = ['.date', '.event-date', '.datetime', 'time'];
          let dateText = '';
          
          for (const selector of dateSelectors) {
            const dateElement = element.querySelector(selector);
            if (dateElement) {
              dateText = dateElement.textContent.trim();
              break;
            }
          }
          
          // If no date element found, try to find date in text content
          if (!dateText) {
            const paragraphs = element.querySelectorAll('p');
            for (const p of paragraphs) {
              const text = p.textContent.trim();
              if (text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i) ||
                  text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/) ||
                  text.match(/\b\d{1,2}:\d{2}\s*[ap]m\b/i)) {
                dateText = text;
                break;
              }
            }
          }
          
          // Extract description
          const descriptionSelectors = ['.description', '.event-description', '.excerpt', 'p'];
          let description = '';
          
          for (const selector of descriptionSelectors) {
            const descElement = element.querySelector(selector);
            if (descElement && descElement.textContent.trim() !== dateText) {
              description = descElement.textContent.trim();
              break;
            }
          }
          
          // Extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.src;
          }
          
          // Extract source URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement) {
            sourceUrl = linkElement.href;
          }
          
          // Add event to list if title exists
          if (title) {
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl
            });
          }
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process events to add parsed dates and generate IDs
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
        
        // Add to events array
        events.push(event);
      }
      
      console.log(`Successfully processed ${events.length} events from ${this.name}`);
      
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

module.exports = RickshawTheatreScraper;
