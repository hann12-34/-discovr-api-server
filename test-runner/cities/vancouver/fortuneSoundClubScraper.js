const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

class FortuneSoundClubScraper {
  constructor(options = {}) {
    // URLs - using do604.com as the primary source for events
    this.venueUrl = 'https://do604.com/venues/fortune-sound-club';
    this.venueName = 'Fortune Sound Club';

    // Options
    this.debug = options.debug || false;
    this.logEvents = options.logEvents || false;
    this.saveHtml = options.saveHtml || false;
    this.saveScreenshots = options.saveScreenshots || false;
    this.debugDir = options.debugDir || path.join(__dirname, 'debug');
    
    // Ensure debug directory exists if in debug mode
    if (this.debug && (this.saveHtml || this.saveScreenshots)) {
      if (!fs.existsSync(this.debugDir)) {
        fs.mkdirSync(this.debugDir, { recursive: true });
      }
    }
  }

  /**
   * Generate a unique slug for an event
   * @param {string} title - Event title
   * @param {Date} date - Event date
   * @returns {string} - Unique identifier for the event
   */
  generateEventId(title, date) {
    const dateStr = date ? date.toISOString().split('T')[0] : 'no-date';
    return slugify(`${this.venueName}-${title}-${dateStr}`, { lower: true });
  }

  /**
   * Parse a date string into a standardized Date object
   * @param {string} dateString - The date string to parse
   * @returns {object} - Object with startDate and endDate properties or null if unparseable
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Clean up the date string
      let dateStr = dateString.trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/\n/g, ' ');  // Replace newlines with spaces
      
      if (this.debug) console.log(`Parsing date string: "${dateStr}"`);
      
      // Extract time if present (e.g., "7:30PM" or "7:30 PM")
      let hour = 20; // Default to 8:00 PM
      let minute = 0;
      let timeFound = false;
      
      const timePattern = /(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m?\.?)/i;
      const timeMatch = dateStr.match(timePattern);
      
      if (timeMatch) {
        timeFound = true;
        hour = parseInt(timeMatch[1], 10);
        minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        
        // Convert to 24-hour format if PM
        if (timeMatch[3].toLowerCase().startsWith('p') && hour < 12) {
          hour += 12;
        }
        
        // AM case - ensure 12 AM is represented as 0 hours
        if (timeMatch[3].toLowerCase().startsWith('a') && hour === 12) {
          hour = 0;
        }
      }
      
      // Special case for do604 format: "18 Jul Pearl & The Oysters..."
      const compactDatePattern = /^(\d{1,2})\s+([a-z]{3})/i;
      const compactMatch = dateStr.match(compactDatePattern);
      
      if (compactMatch) {
        const day = parseInt(compactMatch[1], 10);
        const monthStr = compactMatch[2];
        const year = new Date().getFullYear(); // Use current year
        
        // Convert month abbreviation to month index
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const monthIndex = months.findIndex(m => m === monthStr.toLowerCase());
        
        if (monthIndex !== -1) {
          const startDate = new Date(year, monthIndex, day, hour, minute);
          const endDate = new Date(startDate); // End date is same as start date
          return { startDate, endDate };
        }
      }
      
      // Pattern 1: "Friday, July 5" or "Friday July 5"
      const pattern1 = /(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day,?\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*(\d{4}))?/i;
      const match1 = dateStr.match(pattern1);
      
      if (match1) {
        const month = match1[1];
        const day = parseInt(match1[2], 10);
        // If year is not provided, use current year
        const year = match1[3] ? parseInt(match1[3], 10) : new Date().getFullYear();
        
        try {
          // Convert month name to month index
          const testDate = new Date(`${month} 1, 2020`);
          if (!isNaN(testDate.getTime())) {
            const monthIndex = testDate.getMonth();
            const startDate = new Date(year, monthIndex, day, hour, minute);
            const endDate = new Date(startDate); // End date is same as start date
            return { startDate, endDate };
          }
        } catch (e) {
          if (this.debug) console.log(`Error parsing date pattern 1: ${e.message}`);
        }
      }
      
      // Pattern 2: Simple month/day format: "7/5" or "7/5/2023"
      const pattern2 = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
      const match2 = dateStr.match(pattern2);
      
      if (match2) {
        const month = parseInt(match2[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(match2[2], 10);
        let year = match2[3] ? parseInt(match2[3], 10) : new Date().getFullYear();
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        const startDate = new Date(year, month, day, hour, minute);
        const endDate = new Date(startDate); // End date is same as start date
        return { startDate, endDate };
      }
      
      // Pattern 3: Month Day format without year: "Jul 18" or "July 18"
      const pattern3 = /([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const match3 = dateStr.match(pattern3);
      
      if (match3) {
        const monthStr = match3[1];
        const day = parseInt(match3[2], 10);
        const year = new Date().getFullYear(); // Use current year
        
        // Get month index from month name
        const months = ['january','february','march','april','may','june',
                      'july','august','september','october','november','december'];
        const monthAbbr = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        
        let monthIndex = months.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
        if (monthIndex === -1) {
          monthIndex = monthAbbr.findIndex(m => m.toLowerCase() === monthStr.toLowerCase().substring(0,3));
        }
        
        if (monthIndex !== -1) {
          const startDate = new Date(year, monthIndex, day, hour, minute);
          const endDate = new Date(startDate); // End date is same as start date
          return { startDate, endDate };
        }
      }
      
      // If specific patterns fail, try general date parsing as a last resort
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        // If time wasn't found in the string but the date was valid,
        // set the time to the default (8 PM)
        if (!timeFound) {
          parsedDate.setHours(hour, minute, 0, 0);
        }
        const startDate = new Date(parsedDate);
        const endDate = new Date(startDate); // End date is same as start date
        return { startDate, endDate };
      }
      
      // If we've made it this far, we couldn't parse the date
      if (this.debug) console.log(`Failed to parse date: ${dateStr}`);
      return { startDate: null, endDate: null };
      
    } catch (error) {
      if (this.debug) console.log(`Error parsing date: ${error.message}`);
      return { startDate: null, endDate: null };
    }
  }


  /**
   * Create a standardized event object
   * @param {object} eventData - Raw event data
   * @returns {object} - Standardized event object
   */
  createEventObject(eventData) {
    try {
      // Parse date
      const { startDate, endDate } = eventData.dateText ? 
        this.parseDateRange(eventData.dateText) : 
        { startDate: null, endDate: null };

      // Use current date as fallback if date is missing
      const eventDate = startDate || new Date();
      
      // Create event ID based on title and date
      const eventId = this.generateEventId(eventData.title, eventDate);
      
      // Create standardized event object
      const event = {
        id: eventId,
        title: eventData.title,
        description: eventData.description || '',
        venue: this.venueName,
        venueUrl: this.venueUrl,
        startDate: eventDate,
        endDate: endDate || eventDate,
        url: eventData.sourceUrl || '',
        ticketUrl: eventData.ticketUrl || eventData.sourceUrl || '',
        imageUrl: eventData.imageUrl || '',
        price: eventData.price || '',
        status: 'scheduled',
        usingDateFallback: !startDate // Flag if we're using fallback date
      };
      
      // Log the event if requested
      if (this.logEvents) {
        console.log(`Found event: ${event.title} on ${event.startDate.toDateString()}`);
        if (event.usingDateFallback) {
          console.log(`Warning: Using fallback date for event: ${event.title}`);
        }
      }
      
      return event;
    } catch (e) {
      console.error('Error creating event object:', e);
      return null;
    }
  }

  /**
   * Helper method to sleep/wait for a specified time
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise} - Resolves after waiting
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main scrape method to extract events from the venue
   * @returns {Array} - Array of events
   */
  async scrape() {
    console.log(`🔍 Scraping events from ${this.venueName}...`);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    let events = [];
    
    try {
      console.log(`Navigating to events page: ${this.venueUrl}`);
      await page.goto(this.venueUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Save screenshot for debugging
      if (this.debug && this.saveScreenshots) {
        await page.screenshot({ path: path.join(this.debugDir, 'fortune-sound-club-events-page.png') });
      }
      
      // Save HTML for debugging
      if (this.debug && this.saveHtml) {
        const html = await page.content();
        fs.writeFileSync(path.join(this.debugDir, 'fortune-sound-club-events-page.html'), html);
      }
      
      console.log('Extracting event data...');
      
      // Wait for event cards to load on do604.ca
      await page.waitForSelector('.ds-listing-event-card', { timeout: 30000 })
        .catch(() => console.log('Timeout waiting for event cards, proceeding anyway'));

      console.log('Events found, waiting a moment for all content to load');
      await this.sleep(2000);

      // Extract all event data from the page
      const pageEventsData = await page.evaluate(() => {
        const events = [];
        
        // Find all event cards on do604.com page
        const eventCards = Array.from(document.querySelectorAll('.ds-listing-event-card, .ds-event-card, [class*="event-card"]'));
        
        console.log(`Found ${eventCards.length} event cards`);
        
        eventCards.forEach(card => {
          try {
            // Find title and event link (do604.com specific selectors)
            const titleElement = card.querySelector('.ds-listing-event-title-text, .ds-event-card-title, h3, h4');
            if (!titleElement) return;
            
            const title = titleElement.textContent.trim();
            if (!title) return;
            
            // Find the link to the event - try multiple possible selectors
            const linkElement = card.querySelector('a.ds-listing-event-title, a.ds-event-card-title, a.ds-listing-event-link, a[href*="event"]');
            if (!linkElement) return;
            
            // For the source URL, we need the full absolute URL
            const sourceUrl = new URL(linkElement.href, 'https://do604.com').href;
            
            // Look for date information - do604 puts this in specific elements
            let dateText = '';
            
            // Try to find date in card - do604 specific structure
            const dateElement = card.querySelector('.ds-listing-event-date, .ds-listing-event-time, .ds-event-card-date, .ds-event-datetime, time');
            if (dateElement) {
              dateText = dateElement.textContent.trim();
            }
            
            // For events with separate date and time elements
            if (!dateText) {
              const dateMonthElement = card.querySelector('.ds-event-date-month, [class*="month"]');
              const dateDayElement = card.querySelector('.ds-event-date-day, [class*="day"]');
              const timeElement = card.querySelector('.ds-event-time, [class*="time"]');
              
              if (dateMonthElement && dateDayElement) {
                const month = dateMonthElement.textContent.trim();
                const day = dateDayElement.textContent.trim();
                const time = timeElement ? timeElement.textContent.trim() : '8:00 PM';
                const year = new Date().getFullYear();
                dateText = `${month} ${day}, ${year} ${time}`;
              }
            }
            
            // Description might be in a separate element
            let description = '';
            const descElement = card.querySelector('.ds-listing-event-description, .ds-event-description, .ds-event-card-description, [class*="description"]');
            if (descElement) {
              description = descElement.textContent.trim();
            }
            
            // Find image if available - do604 usually has images in a specific format
            let imageUrl = '';
            const imageElement = card.querySelector('.ds-cover-image img, .ds-event-card-image img, .ds-event-image img, img');
            if (imageElement && imageElement.src) {
              // Make sure we have an absolute URL for the image
              try {
                imageUrl = new URL(imageElement.src, 'https://do604.com').href;
              } catch (e) {
                imageUrl = imageElement.src;
              }
            }
            
            // The ticket URL might be in a separate button or link
            let ticketUrl = sourceUrl;
            const ticketElement = card.querySelector('a.ds-btn-tickets, a[href*="ticket"], a.tickets, a.buy, a[class*="ticket"]');
            if (ticketElement && ticketElement.href) {
              // Make sure we have an absolute URL for the ticket
              try {
                ticketUrl = new URL(ticketElement.href, 'https://do604.com').href;
              } catch (e) {
                ticketUrl = ticketElement.href;
              }
            }
            
            // Add to events array if we have required data
            if (title && sourceUrl) {
              events.push({
                title,
                dateText,
                description,
                imageUrl,
                sourceUrl,
                ticketUrl
              });
            }
          } catch (e) {
            console.error('Error extracting event:', e);
          }
        });
        
        // If we didn't find any events using the card approach, try a more generic approach
        if (events.length === 0) {
          // Look for event links that contain 'events'
          const eventLinks = Array.from(document.querySelectorAll('a[href*="event"]'));
          
          eventLinks.forEach(link => {
            try {
              // Skip if it's a generic link not related to specific events
              if (link.href.includes('/venue/') || 
                  link.href.includes('/help/') || 
                  link.href.includes('/search/')) return;
              
              // Get the parent container that has the event info
              const container = link.closest('article, .event-card, .event-listing, [class*="event-"]') || 
                               link.closest('div[class*="event"]') || 
                               link.parentElement;
              
              if (!container) return;
              
              // Extract title from the link or nearby heading
              let title = link.textContent.trim();
              if (!title) {
                const titleElement = container.querySelector('h3, h4, .title');
                if (titleElement) title = titleElement.textContent.trim();
              }
              if (!title) return;
              
              // The source URL is the event link
              const sourceUrl = link.href;
              
              // The ticket URL is the same as the source URL by default
              let ticketUrl = sourceUrl;
              
              // Check if there's a specific ticket link
              const ticketLink = container.querySelector('a[href*="ticket"], a.tickets, a.buy');
              if (ticketLink && ticketLink.href) {
                ticketUrl = ticketLink.href;
              }
              
              // Look for date information
              let dateText = '';
              
              // Find any element that might contain a date
              const dateElement = container.querySelector('[class*="date"], [class*="time"], time, .calendar');
              
              if (dateElement) {
                dateText = dateElement.textContent.trim();
              }
              
              // Description might be in a separate element
              let description = '';
              const descElement = container.querySelector('[class*="description"], [class*="desc"], [class*="subtitle"]');
              if (descElement) {
                description = descElement.textContent.trim();
              }
              
              // Find image if available
              let imageUrl = '';
              const imageElement = container.querySelector('img');
              if (imageElement && imageElement.src) {
                imageUrl = imageElement.src;
              }
              
              // Add to events array if we have the minimum required data
              if (title && sourceUrl) {
                events.push({
                  title,
                  dateText,
                  description,
                  imageUrl,
                  sourceUrl,
                  ticketUrl
                });
              }
            } catch (e) {
              console.error('Error extracting event via links approach:', e);
            }
          });
        }
        
        return events;
      });
      
      console.log(`Extracted ${pageEventsData.length} events from the page`);
      
      // Process extracted event data into standardized event objects
      const processedEvents = [];
      
      for (const eventData of pageEventsData) {
        const event = this.createEventObject(eventData);
        if (event) {
          processedEvents.push(event);
        }
      }
      
      // Deduplicate events based on id (which includes title and date)
      const eventMap = {};
      processedEvents.forEach(event => {
        eventMap[event.id] = event;
      });
      
      events = Object.values(eventMap);
      
      console.log(`Successfully processed ${events.length} unique events from ${this.venueName}`);
      
    } catch (error) {
      console.error(`Error scraping ${this.venueName}:`, error);
    } finally {
      await browser.close();
    }
    
    return events;
  }
}

module.exports = FortuneSoundClubScraper;
