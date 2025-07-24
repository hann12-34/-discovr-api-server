/**
 * Fox Cabaret Events Scraper (Fixed Version)
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
  url: 'https://www.foxcabaret.com/monthly-calendar',
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
      
      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(30000);
      
      // Navigate to the events page
      console.log(`Navigating to events page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
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
      
      // Extract events
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Look for any of these common event container selectors
        const selectors = [
          '.eventlist-event',
          '.event-list-item',
          '.event-item',
          '.event-card',
          '[data-automation="event-card"]',
          '.event-container'
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
        
        // If no events found with standard selectors, try a broader approach
        if (eventElements.length === 0) {
          // Find any element that likely contains event information
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            // Look for elements with event-related classes
            const classList = el.className || '';
            if (typeof classList === 'string' && 
                (classList.includes('event') || classList.includes('show') || classList.includes('concert'))) {
              eventElements.push(el);
            }
          }
        }
        
        // Process found event elements
        eventElements.forEach(element => {
          // Extract title
          let title = '';
          const titleSelectors = [
            '.eventlist-title', 
            '.event-title', 
            '.title', 
            'h1', 'h2', 'h3', 'h4',
            '.event-name',
            '.summary-title'
          ];
          
          for (const selector of titleSelectors) {
            const titleElement = element.querySelector(selector);
            if (titleElement) {
              title = titleElement.textContent.trim();
              break;
            }
          }
          
          if (!title) return;
          
          // Extract date
          let dateText = '';
          const dateSelectors = [
            '.eventlist-meta-date',
            '.event-date', 
            '.date', 
            '.time', 
            '.datetime',
            '.event-time',
            'time'
          ];
          
          for (const selector of dateSelectors) {
            const dateElement = element.querySelector(selector);
            if (dateElement) {
              dateText = dateElement.textContent.trim();
              break;
            }
          }
          
          // Extract description
          let description = '';
          const descriptionSelectors = [
            '.eventlist-description', 
            '.event-description', 
            '.description', 
            '.summary',
            '.excerpt',
            '.content'
          ];
          
          for (const selector of descriptionSelectors) {
            const descElement = element.querySelector(selector);
            if (descElement) {
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
          
          // Extract event URL
          let sourceUrl = '';
          const linkSelectors = [
            'a.eventlist-title-link', 
            'a.event-link', 
            'a.title-link', 
            'a.event-details',
            'a',
            '.eventlist-column-info a',
          ];
          
          for (const selector of linkSelectors) {
            const linkElement = element.querySelector(selector);
            if (linkElement && linkElement.href) {
              sourceUrl = linkElement.href;
              break;
            }
          }
          
          // Add event data
          events.push({
            title,
            dateText,
            description,
            imageUrl,
            sourceUrl
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process events
      for (const eventData of eventsData) {
        // Skip events without titles
        if (!eventData.title) {
          console.log('Skipping event with no title');
          continue;
        }
        
        console.log(`Processing event: ${eventData.title}`);
        
        // Parse date
        const dateInfo = this.parseDateRange(eventData.dateText);
        
        // Skip events with invalid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
          
          // If we have a source URL, try to visit the event page to get better date information
          if (eventData.sourceUrl && eventData.sourceUrl !== this.url) {
            try {
              console.log(`Trying to get date from event page: ${eventData.sourceUrl}`);
              await page.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 20000 });
              
              // Extract date from event page
              const pageDate = await page.evaluate(() => {
                // Look for date elements
                const dateSelectors = [
                  '.event-date', 
                  '.date', 
                  '.time', 
                  '.datetime',
                  '.event-time',
                  'time',
                  '[itemprop="startDate"]',
                  '[property="startDate"]'
                ];
                
                for (const selector of dateSelectors) {
                  const element = document.querySelector(selector);
                  if (element) return element.textContent.trim();
                }
                
                // Look for schema data
                const jsonLd = document.querySelector('script[type="application/ld+json"]');
                if (jsonLd) {
                  try {
                    const data = JSON.parse(jsonLd.textContent);
                    if (data.startDate) return data.startDate;
                    if (data.date) return data.date;
                  } catch (e) {
                    // JSON parsing failed
                  }
                }
                
                // Look for text containing date patterns
                const allText = document.body.innerText;
                const datePatterns = [
                  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}\b/i,
                  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i,
                  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i,
                  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/
                ];
                
                for (const pattern of datePatterns) {
                  const match = allText.match(pattern);
                  if (match) return match[0];
                }
                
                return null;
              });
              
              if (pageDate) {
                const pageDateInfo = this.parseDateRange(pageDate);
                if (pageDateInfo.startDate && pageDateInfo.endDate) {
                  console.log(`Found date on event page: ${pageDate}`);
                  dateInfo.startDate = pageDateInfo.startDate;
                  dateInfo.endDate = pageDateInfo.endDate;
                }
              }
            } catch (error) {
              console.error(`Error getting date from event page: ${error.message}`);
            }
          }
          
          // If we still don't have a valid date, skip the event
          if (!dateInfo.startDate || !dateInfo.endDate) {
            console.log(`Still could not get a valid date for "${eventData.title}", skipping`);
            continue;
          }
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
