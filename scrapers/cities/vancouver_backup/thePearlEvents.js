const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * The Pearl Events Scraper
 * Scrapes events from The Pearl in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * The Pearl Events Scraper
 */
const ThePearlEvents = {
  name: 'The Pearl',
  url: 'https://thepearlvancouver.com/all-shows/',
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
      
      // Format: "Jul 27 @ 08:00 PM Doors: 07:00 PM"
      const concertPattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*@\s*(\d{1,2}):(\d{2})\s*(AM|PM))?/i;
      const concertMatch = dateString.match(concertPattern);
      
      if (concertMatch) {
        const currentYear = new Date().getFullYear();
        const month = concertMatch[1];
        const day = parseInt(concertMatch[2]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          let hours = 20; // Default to 8:00 PM for concerts
          let minutes = 0;
          
          if (concertMatch[3] && concertMatch[4]) {
            hours = parseInt(concertMatch[3]);
            minutes = parseInt(concertMatch[4]);
            
            // Convert to 24-hour format if PM
            if (concertMatch[5] && concertMatch[5].toUpperCase() === 'PM' && hours < 12) {
              hours += 12;
            }
          }
          
          const startDate = new Date(currentYear, monthNum, day, hours, minutes);
          
          // For concerts, typically set endDate to 3 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Try finding a date with year
      const dateYearPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const dateYearMatch = dateString.match(dateYearPattern);
      
      if (dateYearMatch) {
        const month = dateYearMatch[1];
        const day = parseInt(dateYearMatch[2]);
        const year = parseInt(dateYearMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, day, 20, 0); // Default to 8:00 PM
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = parsedDate;
        
        // Set time to 8:00 PM if no time specified
        if (dateString.indexOf(':') === -1) {
          startDate.setHours(20, 0, 0);
        }
        
        // For concerts, set endDate to 3 hours after startDate
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
    
    return `the-pearl-${slug}-${dateStr}`;
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
        name: 'The Pearl',
        address: '881 Granville Street',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 1K7',
        website: 'https://thepearlvancouver.com',
        googleMapsUrl: 'https://goo.gl/maps/P1iFqb5Hjgg2tVS16'
      },
      categories: [
        'music',
        'nightlife',
        'concert',
        'entertainment'
      ],
      price: price || '',
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'the-pearl'
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
      
      // Use longer timeout
      page.setDefaultNavigationTimeout(30000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/pearl_debug.png' });
      console.log('Saved debug screenshot to /tmp/pearl_debug.png');
      
      // Wait for elements to load
      try {
        await page.waitForSelector('.show-item, .event-list-item, .events-item, article, .event, .show, [class*="event"], [class*="show"]', { timeout: 15000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Wait a bit longer for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Extract events data using multiple approaches
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Approach 1: Find events via structured containers
        // Try different selectors for event items - expanded to capture more potential containers
        const eventSelectors = [
          // Standard event containers
          '.show-item', '.event-list-item', '.events-item', '.event', '.show', 
          // Article or card based layouts
          'article', '.event-card', '.show-card', '.card', '.entry', '.list-item',
          // Grid or calendar layouts 
          '.event-grid-item', '.calendar-item', '.listing',
          // General containers that might contain events
          '[class*="event"]', '[class*="show"]', '.post', '.item', '.performance', '.listing'
        ];
        
        // Combine all event elements
        let eventElements = [];
        eventSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            eventElements = [...eventElements, ...Array.from(elements)];
          }
        });
        
        console.log(`Found ${eventElements.length} potential event containers`);
        
        // Process each container
        eventElements.forEach(element => {
          try {
            // Try multiple selectors for title
            let title = '';
            const titleSelectors = ['h1', 'h2', 'h3', 'h4', '.title', '.event-title', '.show-title', '.name', 
                                  '.card-title', '.entry-title', '.heading', '[class*="title"]', '[class*="heading"]'];
                                  
            for (const selector of titleSelectors) {
              const titleElement = element.querySelector(selector);
              if (titleElement && titleElement.textContent.trim()) {
                title = titleElement.textContent.trim();
                break;
              }
            }
            
            // If no title found in selectors, try link text
            if (!title) {
              const linkElement = element.querySelector('a');
              if (linkElement && linkElement.textContent.trim()) {
                title = linkElement.textContent.trim();
              }
            }
            
            // Skip if no title found
            if (!title) return;
            
            // Extract description - try multiple selectors
            let description = '';
            const descSelectors = ['p', '.description', '.excerpt', '.summary', '.show-description', '.content', '.details'];
            for (const selector of descSelectors) {
              const descElement = element.querySelector(selector);
              if (descElement && descElement.textContent.trim()) {
                description = descElement.textContent.trim();
                break;
              }
            }
            
            // Extract date - try multiple selectors
            let dateText = '';
            const dateSelectors = ['.date', 'time', '.event-date', '.show-date', '.datetime', '.when', '.calendar', '[class*="date"]'];
            for (const selector of dateSelectors) {
              const dateElement = element.querySelector(selector);
              if (dateElement && dateElement.textContent.trim()) {
                dateText = dateElement.textContent.trim();
                break;
              }
            }
            
            // Extract image URL
            let imageUrl = '';
            const imgElement = element.querySelector('img');
            if (imgElement && imgElement.src) {
              imageUrl = imgElement.src;
            }
            
            // Extract source URL - try multiple selectors
            let sourceUrl = '';
            const linkSelectors = ['a.more', 'a.details', 'a.link', 'a.button', 'a.btn', 'a[href*="event"]', 'a'];
            for (const selector of linkSelectors) {
              const linkElement = element.querySelector(selector);
              if (linkElement && linkElement.href) {
                sourceUrl = linkElement.href;
                break;
              }
            }
            
            // Extract price if available - try multiple selectors
            let price = '';
            const priceSelectors = ['.price', '.ticket-price', '.cost', '[class*="price"]', '[class*="cost"]'];
            for (const selector of priceSelectors) {
              const priceElement = element.querySelector(selector);
              if (priceElement && priceElement.textContent.trim()) {
                const priceText = priceElement.textContent.trim();
                const priceMatch = priceText.match(/\$\d+(\.\d{2})?/);
                if (priceMatch) {
                  price = priceMatch[0];
                  break;
                }
              }
            }
            
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              price
            });
          } catch (err) {
            console.log('Error extracting event:', err);
          }
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event data
      for (const eventData of eventsData) {
        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);
        
        // If we don't have date info from the main page, visit the event page to try to find it
        if ((!dateInfo.startDate || !dateInfo.endDate) && eventData.sourceUrl) {
          console.log(`Visiting event page for ${eventData.title} to find date information...`);
          
          try {
            await page.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            
            // Try to find date information on the event page
            const eventPageDateText = await page.evaluate(() => {
              const dateSelectors = [
                '.date', '.show-date', '.event-date', 
                'time', '[itemprop="startDate"]', '.datetime'
              ];
              
              for (const selector of dateSelectors) {
                const elem = document.querySelector(selector);
                if (elem) {
                  return elem.textContent.trim();
                }
              }
              
              // Try to find any text that looks like a date
              const paragraphs = Array.from(document.querySelectorAll('p, h4, h5'));
              for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(text)) {
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
module.exports = new ThePearlEvents();
