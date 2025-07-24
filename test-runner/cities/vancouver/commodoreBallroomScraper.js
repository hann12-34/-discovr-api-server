/**
 * Commodore Ballroom Events Scraper
 * Scrapes events from the Commodore Ballroom in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs').promises;
const path = require('path');

/**
 * Commodore Ballroom Events Scraper
 */
const CommodoreBallroomScraper = {
  name: 'Commodore Ballroom',
  url: 'https://www.commodoreballroom.com/shows',
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
      dateString = dateString.replace(/\\s+/g, ' ').trim();
      
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
      
      // Match full date with year like "January 15, 2025" or "Jan 15 2025"
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
      
      // Match dates like "Friday, July 26, 2025"
      const dayOfWeekPattern = /(?:[A-Za-z]+),\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const dayOfWeekMatch = dateString.match(dayOfWeekPattern);
      
      if (dayOfWeekMatch) {
        const month = dayOfWeekMatch[1];
        const day = parseInt(dayOfWeekMatch[2]);
        const year = parseInt(dayOfWeekMatch[3]);
        
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
      
      // Match short date like "January 15" or "Jan 15" for current year
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
    } else {
      // If no date, use a timestamp to ensure uniqueness
      dateStr = new Date().toISOString().split('T')[0];
    }
    
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `commodore-ballroom-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, ticketUrl) {
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: ticketUrl || sourceUrl || this.url,
      venue: {
        name: 'Commodore Ballroom',
        address: '868 Granville Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 1K3',
        website: 'https://www.commodoreballroom.com',
        googleMapsUrl: 'https://maps.app.goo.gl/YwNRCCZnQCwAGnfCA'
      },
      categories: [
        'arts',
        'music',
        'performance',
        'concert'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'commodore-ballroom'
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
   * Extract JSON-LD structured data from a page
   * @param {Object} page - Puppeteer page object
   * @returns {Array} - Array of parsed JSON-LD objects
   */
  async extractJsonLd(page) {
    try {
      const jsonLdData = await page.evaluate(() => {
        const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        return jsonLdScripts.map(script => {
          try {
            return JSON.parse(script.textContent);
          } catch (e) {
            return null;
          }
        }).filter(data => data !== null);
      });
      
      return jsonLdData;
    } catch (error) {
      console.error(`Error extracting JSON-LD: ${error.message}`);
      return [];
    }
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
      
      // Navigate to the events page
      console.log(`Navigating to events page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000
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
      await page.screenshot({ path: path.join(debugDir, `commodore-ballroom-${timestamp}.png`) });
      const html = await page.content();
      await fs.writeFile(path.join(debugDir, `commodore-ballroom-${timestamp}.html`), html);
      
      console.log('Extracting event data...');
      
      // Check for "Load More" button or pagination
      let hasMore = true;
      let loadMoreAttempts = 0;
      const maxLoadMoreAttempts = 5; // Prevent infinite loading
      
      // Wait for event links to load
      await page.waitForSelector('a[href*="/event/"], a[href*="ticketmaster.ca"]', { timeout: 30000 })
        .catch(() => console.log('Timeout waiting for event links, proceeding anyway'));

      console.log('Events found, waiting a moment for all content to load');
      await this.sleep(2000);

      // We don't need to click load more for this site as all events appear to be listed on the main page
      
      // Extract all event data after loading more events
      const pageEventsData = await page.evaluate(() => {
        const events = [];
        
        // The Commodore Ballroom site lists events with title, date, and ticket link
        // Each event typically has a pattern like "Event Name\nDate\nBuy Tickets"
        const allLinks = Array.from(document.querySelectorAll('a[href*="ticketmaster.ca"]'));
        const buyTicketsLinks = allLinks.filter(link => link.textContent.includes('Buy Tickets'));
        
        console.log(`Found ${buyTicketsLinks.length} potential ticket links`);
        
        buyTicketsLinks.forEach(ticketLink => {
          try {
            // Get the parent container that has the event info
            const container = ticketLink.parentElement;
            if (!container) return;
            
            // The title is usually in an anchor element after the Buy Tickets link
            // or it's a sibling of the Buy Tickets link
            const titleLink = container.nextElementSibling?.querySelector('a') || 
                              Array.from(container.parentElement?.querySelectorAll('a') || []).find(a => !a.textContent.includes('Buy Tickets'));
            
            // Skip if we can't find a title
            if (!titleLink) return;
            
            const title = titleLink.textContent.trim();
            if (!title) return;
            
            // The ticket URL is in the Buy Tickets link
            const ticketUrl = ticketLink.href;
            
            // The source URL is the same as ticket URL or in the title link
            const sourceUrl = titleLink.href || ticketUrl;
            
            // The date is usually text before the Buy Tickets link
            let dateText = '';
            const prevNode = ticketLink.previousSibling;
            if (prevNode && prevNode.textContent) {
              // Look for date pattern in the text
              const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/i;
              const match = prevNode.textContent.match(datePattern);
              if (match) {
                dateText = match[0];
              } else {
                // Try to find any date-like text
                const text = prevNode.textContent.trim();
                if (/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}/i.test(text)) {
                  dateText = text;
                }
              }
            }
            
            // If we still don't have a date, look around the container
            if (!dateText) {
              // Try to find any text with month names or numbers that could be a date
              const nearbyText = container.parentElement?.textContent || '';
              const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/i;
              const match = nearbyText.match(datePattern);
              if (match) {
                dateText = match[0];
              }
            }
            
            // Description might not be available on the main page
            let description = '';
            
            // Images might not be directly associated with events on this page
            let imageUrl = '';
            const nearbyImage = container.parentElement?.querySelector('img') || titleLink.querySelector('img');
            if (nearbyImage && nearbyImage.src) {
              imageUrl = nearbyImage.src;
            }
            
            // Add to events array
            events.push({
              title,
              dateText,
              description,
              imageUrl,
              sourceUrl,
              ticketUrl
            });
          } catch (e) {
            // Skip any events that cause errors during extraction
            console.error('Error extracting event:', e);
          }
        });
        
        // If we didn't find events with the above approach, try an alternative
        if (events.length === 0) {
          // Look for event title links which might be on a different format of the page
          const allTicketmasterLinks = Array.from(document.querySelectorAll('a[href*="ticketmaster.ca"]'));
          const eventTitleLinks = allTicketmasterLinks.filter(link => !link.textContent.includes('Buy Tickets'));
          
          eventTitleLinks.forEach(titleLink => {
            try {
              const title = titleLink.textContent.trim();
              if (!title) return;
              
              const sourceUrl = titleLink.href;
              const ticketUrl = sourceUrl;
              
              // Try to find date near the title link
              let dateText = '';
              // Look at siblings and parent content
              const parentContent = titleLink.parentElement?.textContent || '';
              const datePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/i;
              const match = parentContent.match(datePattern);
              if (match) {
                dateText = match[0];
              }
              
              events.push({
                title,
                dateText,
                description: '',
                imageUrl: '',
                sourceUrl,
                ticketUrl
              });
            } catch (e) {
              console.error('Error extracting event from title link:', e);
            }
          });
        }
        
        return events;
      });
      
      console.log(`Found ${pageEventsData.length} potential events`);
      
      // Process events
      for (const eventData of pageEventsData) {
        // Skip events without titles
        if (!eventData.title) {
          console.log('Skipping event with no title');
          continue;
        }
        
        console.log(`Processing event: ${eventData.title}`);
        
        let dateInfo = { startDate: null, endDate: null };
        
        // If the event has a detail page, visit it to get more information
        if (eventData.sourceUrl) {
          try {
            console.log(`Navigating to event page: ${eventData.sourceUrl}`);
            
            // Add a small delay between requests to avoid rate limiting
            await this.sleep(1000);
            
            await page.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Extract detailed event information from the event page
            const detailData = await page.evaluate(() => {
              const data = {};
              
              // Try to find a more detailed date
              const dateElement = document.querySelector('.event-date, .date-display, time');
              if (dateElement) {
                data.dateText = dateElement.textContent.trim();
                if (dateElement.dateTime) {
                  data.dateTime = dateElement.dateTime;
                }
              }
              
              // Try to find a more detailed time
              const timeElement = document.querySelector('.event-time, .time-display');
              if (timeElement) {
                data.timeText = timeElement.textContent.trim();
              }
              
              // Try to find a more detailed description
              const descElement = document.querySelector('.event-description, .description');
              if (descElement) {
                data.description = descElement.textContent.trim();
              }
              
              // Try to find a better image
              const imageElement = document.querySelector('.event-image img, .hero-image img');
              if (imageElement && imageElement.src) {
                data.imageUrl = imageElement.src;
              }
              
              return data;
            });
            
            // Extract JSON-LD data which might contain event details
            const jsonLdData = await this.extractJsonLd(page);
            
            // Look for Event type in JSON-LD
            let eventJsonLd = null;
            for (const jsonLd of jsonLdData) {
              if (jsonLd['@type'] === 'Event' || 
                  (Array.isArray(jsonLd['@type']) && jsonLd['@type'].includes('Event'))) {
                eventJsonLd = jsonLd;
                break;
              }
            }
            
            // Update event data with details from the event page
            if (detailData.dateText) {
              eventData.dateText = detailData.dateText;
            }
            
            if (detailData.dateTime) {
              // Use the datetime attribute if available (ISO format date)
              dateInfo = this.parseDateRange(detailData.dateTime);
            } else if (eventData.dateText) {
              // Otherwise parse the date text
              dateInfo = this.parseDateRange(eventData.dateText);
            }
            
            if (detailData.timeText && !dateInfo.startDate) {
              // Try parsing with the time text added
              dateInfo = this.parseDateRange(`${eventData.dateText} ${detailData.timeText}`);
            }
            
            if (detailData.description) {
              eventData.description = detailData.description;
            }
            
            if (detailData.imageUrl) {
              eventData.imageUrl = detailData.imageUrl;
            }
            
            // Use JSON-LD data if available
            if (eventJsonLd) {
              if (eventJsonLd.name && !eventData.title) {
                eventData.title = eventJsonLd.name;
              }
              
              if (eventJsonLd.description && !eventData.description) {
                eventData.description = eventJsonLd.description;
              }
              
              if (eventJsonLd.image && !eventData.imageUrl) {
                eventData.imageUrl = Array.isArray(eventJsonLd.image) 
                  ? eventJsonLd.image[0] 
                  : eventJsonLd.image;
              }
              
              if (eventJsonLd.startDate && !dateInfo.startDate) {
                dateInfo = this.parseDateRange(eventJsonLd.startDate);
              }
              
              if (eventJsonLd.url && !eventData.sourceUrl) {
                eventData.sourceUrl = eventJsonLd.url;
              }
              
              if (eventJsonLd.offers && eventJsonLd.offers.url && !eventData.ticketUrl) {
                eventData.ticketUrl = eventJsonLd.offers.url;
              }
            }
            
          } catch (error) {
            console.error(`Error getting detail for "${eventData.title}": ${error.message}`);
          }
        } else if (eventData.dateText) {
          // If there's no detail page but we have date text, try to parse it
          dateInfo = this.parseDateRange(eventData.dateText);
        }
        
        // If we still don't have valid dates, use current date as fallback 
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
          eventData.sourceUrl,
          eventData.ticketUrl
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

module.exports = CommodoreBallroomScraper;
