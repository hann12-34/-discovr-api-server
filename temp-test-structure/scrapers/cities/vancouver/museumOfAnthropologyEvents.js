/**
 * Museum of Anthropology Events Scraper
 * 
 * This scraper extracts events from the Museum of Anthropology (MOA) website
 * Source: https://moa.ubc.ca/events/
 * 
 * Uses Puppeteer to handle JavaScript-rendered content
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class MuseumOfAnthropologyEvents {
  constructor() {
    this.name = 'Museum of Anthropology';
    this.url = 'https://moa.ubc.ca/events/';
    this.sourceIdentifier = 'museum-of-anthropology';
    this.enabled = true;
    
    // Venue information
    this.venue = {
      name: 'Museum of Anthropology at UBC',
      address: '6393 NW Marine Drive',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6T 1Z2',
      website: 'https://moa.ubc.ca/',
      googleMapsUrl: 'https://goo.gl/maps/KvzfRMYMNAQpzcbR7'
    };
  }

  /**
   * Format a date range string into standard format
   * @param {string} dateStr - Date string from website
   * @returns {Object} - Object containing start and end dates
   */
  parseDateRange(dateStr) {
    // Generate placeholder dates (one week from now)
    const generatePlaceholderDates = () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7); // Start one week from now
      startDate.setHours(10, 0, 0, 0); // Set to 10:00 AM
      
      const endDate = new Date(startDate);
      endDate.setHours(17, 0, 0, 0); // Set to 5:00 PM same day
      
      return { 
        startDate, 
        endDate,
        isPlaceholder: true
      };
    };
    
    // If no date string provided, return placeholder dates
    if (!dateStr || !dateStr.trim()) {
      console.log(`No date text provided, using placeholder dates`);
      return generatePlaceholderDates();
    }
    
    try {
      // Handle various date formats
      dateStr = dateStr.trim().replace(/\s+/g, ' ');
      
      // Replace common words with standardized formats
      dateStr = dateStr
        .replace(/(\d+)(st|nd|rd|th)/g, '$1')  // Remove ordinals
        .replace(/from/gi, '')                 // Remove "from" word
        .replace(/\|/g, ' - ');                // Replace pipe with hyphen
      
      // Check for time-only strings (no dates)
      if (/^\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i.test(dateStr)) {
        // This is just a time, not a date - use placeholder dates
        console.log(`Time-only string found: "${dateStr}", using placeholder dates`);
        return generatePlaceholderDates();
      }
      
      // Special case for "Ongoing" exhibitions
      if (/ongoing|permanent|continues|daily/i.test(dateStr)) {
        const startDate = new Date(); // Today
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // Three months from now
        endDate.setHours(17, 0, 0, 0); // Set to 5:00 PM
        
        console.log(`Ongoing exhibition detected: "${dateStr}", using extended date range`);
        return { startDate, endDate };
      }
      
      // Check for date range with various separators
      if (dateStr.match(/[-–—to]/)) {
        const separator = dateStr.match(/[-–—]/)?.[0] || 'to';
        let [startPart, endPart] = dateStr.split(new RegExp(`\\s*${separator}\\s*`)).map(s => s.trim());
        
        // If end part doesn't have year but start part does, add the year
        if (startPart.includes('202') && !endPart.includes('202')) {
          const year = startPart.match(/202\d/)?.[0];
          if (year) {
            // If end part has month but no year, add the year
            if (endPart.match(/[A-Za-z]+\s+\d+/)) {
              endPart = `${endPart}, ${year}`;
            }
          }
        }
        
        // Remove time information from date parts if present
        startPart = startPart.replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i, '').trim();
        endPart = endPart.replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i, '').trim();
        
        const startDate = new Date(startPart);
        const endDate = new Date(endPart);
        endDate.setHours(23, 59, 59);
        
        // Check if dates are valid
        if (!isNaN(startDate) && !isNaN(endDate)) {
          return { startDate, endDate };
        }
      } 
      
      // Try parsing single date (remove any time information first)
      const cleanedDateStr = dateStr.replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)/i, '').trim();
      const date = new Date(cleanedDateStr);
      
      if (!isNaN(date)) {
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59);
        return { startDate: date, endDate };
      }
      
      // Handle special date formats like "January 2023"
      const monthYearMatch = dateStr.match(/([A-Za-z]+)\s+(202\d)/i);
      if (monthYearMatch) {
        const month = monthYearMatch[1];
        const year = monthYearMatch[2];
        const monthIndex = new Date(`${month} 1, 2000`).getMonth();
        
        if (!isNaN(monthIndex)) {
          const startDate = new Date(year, monthIndex, 1);
          const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // If all parsing methods fail, use placeholder dates
      console.log(`Could not parse date string: "${dateStr}", using placeholder dates`);
      return generatePlaceholderDates();
    } catch (error) {
      console.log(`Error parsing date "${dateStr}": ${error.message}, using placeholder dates`);
      return generatePlaceholderDates();
    }
  }

  /**
   * Generate an event ID based on title and date
   * @param {string} title - Event title
   * @param {Date} date - Event date
   * @returns {string} - Slugified ID
   */
  generateEventId(title, date) {
    const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
    const slug = slugify(`${title}-${dateStr}`, { lower: true, strict: true });
    return `${this.sourceIdentifier}-${slug}`;
  }

  /**
   * Create a properly formatted event object
   * @param {string} id - Event ID
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @param {Date} startDate - Event start date
   * @param {Date} endDate - Event end date
   * @param {string} imageUrl - Event image URL
   * @param {string} sourceUrl - Original source URL
   * @param {string} ticketUrl - Ticket purchase URL
   * @returns {Object} - Formatted event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, ticketUrl = null) {
    // Determine categories based on event content
    const categories = this.determineCategories(title, description);
    
    return {
      id: id,
      title: title,
      description: description,
      startDate: startDate,
      endDate: endDate,
      imageUrl: imageUrl,
      sourceUrl: sourceUrl,
      ticketUrl: ticketUrl || sourceUrl,
      venue: this.venue,
      categories: categories,
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: this.sourceIdentifier,
    };
  }

  /**
   * Determine categories based on event content
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @returns {Array<string>} - List of applicable categories
   */
  determineCategories(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const categories = ['arts', 'museum', 'cultural'];
    
    if (text.includes('exhibition') || text.includes('exhibit')) {
      categories.push('exhibition');
    }
    
    if (text.includes('workshop') || text.includes('class')) {
      categories.push('workshop');
    }
    
    if (text.includes('tour') || text.includes('guided')) {
      categories.push('tour');
    }
    
    if (text.includes('family') || text.includes('kid') || text.includes('child')) {
      categories.push('family');
    }
    
    if (text.includes('lecture') || text.includes('talk') || text.includes('panel')) {
      categories.push('talk');
    }
    
    if (text.includes('indigenous') || text.includes('first nations') || text.includes('aboriginal')) {
      categories.push('indigenous');
    }
    
    return categories;
  }

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
      
      // Extract events from the main events page
      const extractedEvents = await page.evaluate(() => {
        const events = [];
        
        // Look for event containers
        const eventElements = Array.from(document.querySelectorAll('.event-item, .event, article, .post, .card, .content-block, .event-listing'));
        
        eventElements.forEach(element => {
          // Extract event data
          const title = element.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
          if (!title) return;
          
          const description = element.querySelector('p, .description, .excerpt, .summary')?.textContent.trim() || '';
          const dateText = element.querySelector('.date, .event-date, time, .datetime')?.textContent.trim() || '';
          
          // Get image if available
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Get link to event page if available
          let link = '';
          const linkElement = element.querySelector('a[href]');
          if (linkElement) {
            try {
              link = new URL(linkElement.href, window.location.href).href;
            } catch (e) {
              // Use relative link if URL construction fails
              link = linkElement.getAttribute('href');
            }
          }
          
          // Only include events with a title
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
      
      // Process each extracted event
      for (const eventData of extractedEvents) {
        const { title, description, dateText, imageUrl, link } = eventData;
        
        // Parse date information
        const dateInfo = this.parseDateRange(dateText);
        
        // Generate event ID
        const eventId = this.generateEventId(title, dateInfo.startDate);
        
        // Log placeholder date usage for debugging
        if (dateInfo.isPlaceholder) {
          console.log(`Using placeholder dates for event: "${title}" (original date text: "${dateText || 'none'}")`);
        }
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          title,
          description,
          dateInfo.startDate,
          dateInfo.endDate,
          imageUrl,
          link || this.url
        );
        
        // Add a note about placeholder dates in the description if applicable
        if (dateInfo.isPlaceholder) {
          event.description = `[Note: Event date estimated] ${event.description}`;
        }
        
        events.push(event);
      }
      
      // If no events found on the main page, look for an upcoming events section or calendar
      if (events.length === 0) {
        // Check for a "Calendar" or "Upcoming Events" section
        const calendarPages = [
          '/calendar/', 
          '/upcoming-events/', 
          '/exhibitions/',
          '/whats-on/'
        ];
        
        for (const calendarPath of calendarPages) {
          try {
            const calendarUrl = new URL(calendarPath, 'https://moa.ubc.ca').href;
            console.log(`Checking for events at: ${calendarUrl}`);
            
            await page.goto(calendarUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Extract events from calendar page
            const calendarEvents = await page.evaluate(() => {
              const events = [];
              
              // Look for event elements
              const eventElements = Array.from(document.querySelectorAll('.event, .calendar-event, .exhibition, article, .card'));
              
              eventElements.forEach(el => {
                const title = el.querySelector('h2, h3, h4, .title, .event-title')?.textContent.trim() || '';
                if (!title) return;
                
                const description = el.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
                const dateText = el.querySelector('.date, .event-date, time, .datetime')?.textContent.trim() || '';
                
                const imgElement = el.querySelector('img');
                const imageUrl = imgElement ? imgElement.src : '';
                
                const linkElement = el.querySelector('a[href]');
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
            
            // Process calendar events
            for (const eventData of calendarEvents) {
              const dateInfo = this.parseDateRange(eventData.dateText);
              
              // Skip events with no dates
              if (!dateInfo.startDate && !dateInfo.endDate) continue;
              
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
                eventData.link || calendarUrl
              );
              
              events.push(event);
            }
            
            // If we found events on this page, no need to check others
            if (calendarEvents.length > 0) {
              break;
            }
          } catch (error) {
            console.log(`Error checking ${calendarPath}: ${error.message}`);
            continue;
          }
        }
      }
      
      // If we still have no events, check the current exhibitions
      if (events.length === 0) {
        try {
          const exhibitionsUrl = 'https://moa.ubc.ca/exhibitions/';
          console.log(`Checking for exhibitions at: ${exhibitionsUrl}`);
          
          await page.goto(exhibitionsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Extract exhibition items
          const exhibitions = await page.evaluate(() => {
            const items = [];
            
            // Look for exhibition elements
            const exhibitionElements = Array.from(document.querySelectorAll('.exhibition, article, .card, .content-block'));
            
            exhibitionElements.forEach(el => {
              const title = el.querySelector('h2, h3, h4, .title')?.textContent.trim() || '';
              if (!title) return;
              
              const description = el.querySelector('p, .description, .excerpt')?.textContent.trim() || '';
              let dateText = el.querySelector('.date, .exhibition-date, time')?.textContent.trim() || '';
              
              // Many exhibition pages include dates in the description if not in a specific date element
              if (!dateText && description) {
                const dateMatch = description.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+202\d\s*[-–—]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,\s+202\d/i);
                if (dateMatch) {
                  dateText = dateMatch[0];
                }
              }
              
              const imgElement = el.querySelector('img');
              const imageUrl = imgElement ? imgElement.src : '';
              
              const linkElement = el.querySelector('a[href]');
              const link = linkElement ? new URL(linkElement.href, window.location.href).href : '';
              
              if (title) {
                items.push({
                  title,
                  description,
                  dateText,
                  imageUrl,
                  link
                });
              }
            });
            
            return items;
          });
          
          // Process exhibitions as events
          for (const exhibition of exhibitions) {
            const dateInfo = this.parseDateRange(exhibition.dateText);
            
            // For exhibitions without clear dates, use a default range
            let startDate = dateInfo.startDate;
            let endDate = dateInfo.endDate;
            
            if (!startDate || !endDate) {
              // Default to current year exhibition
              const now = new Date();
              startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 current year
              endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59); // Dec 31 current year
            }
            
            // Generate exhibition ID
            const exhibitionId = this.generateEventId(exhibition.title, startDate);
            
            // Create exhibition event object
            const exhibitionEvent = this.createEventObject(
              exhibitionId,
              exhibition.title,
              exhibition.description,
              startDate,
              endDate,
              exhibition.imageUrl,
              exhibition.link || exhibitionsUrl
            );
            
            events.push(exhibitionEvent);
          }
        } catch (error) {
          console.log(`Error checking exhibitions: ${error.message}`);
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
}

module.exports = new MuseumOfAnthropologyEvents();
