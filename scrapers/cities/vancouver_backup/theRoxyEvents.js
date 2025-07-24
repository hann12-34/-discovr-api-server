/**
 * The Roxy Events Scraper
 * Scrapes events from The Roxy in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * The Roxy Events Scraper
 */
const TheRoxyEvents = {
  name: 'The Roxy',
  url: 'http://www.roxyvan.com/events',
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
      
      // Handle various date formats
      
      // Format: "January 1" or "Jan 1" or similar
      const shortDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const shortDateMatch = dateString.match(shortDatePattern);
      
      if (shortDateMatch) {
        const currentYear = new Date().getFullYear();
        const month = shortDateMatch[1];
        const day = parseInt(shortDateMatch[2]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Check for time information
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/;
          const timeMatch = dateString.match(timePattern);
          
          let hours = 21; // Default to 9:00 PM for club events if no time provided
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
          
          const startDate = new Date(currentYear, monthNum, day, hours, minutes);
          
          // For nightclub events, typically set endDate to 4 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 4);
          
          return { startDate, endDate };
        }
      }
      
      // Format: "January 1, 2025" or similar
      const fullDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
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
          // Check for time information
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/;
          const timeMatch = dateString.match(timePattern);
          
          let hours = 21; // Default to 9:00 PM for club events
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
          
          const startDate = new Date(year, monthNum, day, hours, minutes);
          
          // For club events, typically set endDate to 4 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 4);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        // Default to 9:00 PM for club events if time not included in standard date
        const hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/);
        
        const startDate = new Date(parsedDate);
        if (!hasTimeInfo) {
          startDate.setHours(21, 0, 0);
        }
        
        // For club events, typically set endDate to 4 hours after startDate
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 4);
        
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
    
    return `the-roxy-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, price) {
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
        name: 'The Roxy',
        address: '932 Granville St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 1L2',
        website: 'http://www.roxyvan.com',
        googleMapsUrl: 'https://goo.gl/maps/T5rbVBinE8cJuU2w9'
      },
      categories: [
        'music',
        'nightlife',
        'club',
        'entertainment',
        'live-music'
      ],
      price: price || '',
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'the-roxy'
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
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set a realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Override the navigator.webdriver property to prevent detection
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false
        });
        
        // Overwrite the plugins property to use a custom getter
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: 'Portable Document Format' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: 'Native Client' }
          ]
        });
        
        // Add language to the navigator
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
      });
      
      page.setDefaultNavigationTimeout(30000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for the page to fully load (using waitForSelector instead of waitForTimeout)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for event items
        const eventElements = Array.from(document.querySelectorAll(
          '.event-item, .event-block, .event-card, .event, article, .calendar-event, .gig'
        ));
        
        eventElements.forEach(element => {
          // Extract title
          const titleElement = element.querySelector('h1, h2, h3, h4, .title, .event-title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          if (!title) return;
          
          // Extract description
          const descElement = element.querySelector('p, .description, .excerpt, .summary');
          const description = descElement ? descElement.textContent.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('.date, time, .event-date, .when');
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          
          // Extract image URL
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement ? imageElement.src : '';
          
          // Extract source URL
          const linkElement = element.querySelector('a[href]');
          const sourceUrl = linkElement ? linkElement.href : '';
          
          // Extract price if available
          const priceElement = element.querySelector('.price, .ticket-price, .cost');
          const price = priceElement ? priceElement.textContent.trim() : '';
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl,
            price
          });
        });
        
        // If the standard event selectors didn't find anything, try an alternative approach
        if (events.length === 0) {
          // Check for calendar or event list items
          const calendarItems = Array.from(document.querySelectorAll(
            '.calendar-item, .event-list-item, .event-listing, .event-row, tr[data-event-id]'
          ));
          
          calendarItems.forEach(item => {
            // Extract data from different DOM structure
            const title = item.querySelector('[data-event-title], .title, .summary')?.textContent.trim() || '';
            if (!title) return;
            
            const description = item.querySelector('[data-event-description], .description')?.textContent.trim() || '';
            const dateText = item.querySelector('[data-event-date], .date')?.textContent.trim() || '';
            const imageUrl = item.querySelector('img')?.src || '';
            const sourceUrl = item.querySelector('a[href]')?.href || '';
            const price = item.querySelector('[data-event-price], .price')?.textContent.trim() || '';
            
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              price
            });
          });
        }
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // If no events found using DOM selectors, try scraping the raw HTML content
      if (eventsData.length === 0) {
        console.log('No events found with DOM selectors, trying alternative approach...');
        
        // Get the page content and look for event information
        const htmlContent = await page.content();
        
        // Look for date patterns in the HTML
        const dateMatches = htmlContent.match(/([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?)/g);
        const eventTitles = htmlContent.match(/<h\d[^>]*>(.*?)<\/h\d>/g);
        
        if (eventTitles && eventTitles.length > 0) {
          console.log(`Found ${eventTitles.length} potential event titles in HTML`);
          
          for (let i = 0; i < eventTitles.length; i++) {
            const titleMatch = eventTitles[i].match(/<h\d[^>]*>(.*?)<\/h\d>/);
            if (!titleMatch || !titleMatch[1]) continue;
            
            const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
            if (!title) continue;
            
            let dateText = '';
            // Try to find a date near this title
            if (dateMatches && i < dateMatches.length) {
              dateText = dateMatches[i];
            }
            
            // Create event data
            eventsData.push({
              title,
              description: '',
              dateText,
              imageUrl: '',
              sourceUrl: '',
              price: ''
            });
          }
        }
      }
      
      // Process each event data
      for (const eventData of eventsData) {
        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);
        
        // If we don't have date info from the main page and we have a source URL, visit the event page
        if ((!dateInfo.startDate || !dateInfo.endDate) && eventData.sourceUrl) {
          console.log(`Visiting event page for ${eventData.title} to find date information...`);
          
          try {
            await page.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            
            // Try to find date information on the event page
            const eventPageDateText = await page.evaluate(() => {
              const dateSelectors = [
                '.date', '.event-date', '.when', 
                'time', '[itemprop="startDate"]', 
                '.datetime', '.calendar-date'
              ];
              
              for (const selector of dateSelectors) {
                const elem = document.querySelector(selector);
                if (elem) {
                  return elem.textContent.trim();
                }
              }
              
              // Try to find any text that looks like a date
              const paragraphs = Array.from(document.querySelectorAll('p, h4, h5, .event-details'));
              for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) {
                  return text;
                }
              }
              
              return '';
            });
            
            if (eventPageDateText) {
              const eventPageDateInfo = this.parseDateRange(eventPageDateText);
              if (eventPageDateInfo.startDate) {
                dateInfo.startDate = eventPageDateInfo.startDate;
                dateInfo.endDate = eventPageDateInfo.endDate;
              }
            }
          } catch (error) {
            console.error(`Error visiting event page: ${error.message}`);
          }
        }
        
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
          eventData.price
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
module.exports = new TheRoxyEvents();
