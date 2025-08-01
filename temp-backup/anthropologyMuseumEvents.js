/**
 * Museum of Anthropology (MOA) Events Scraper
 * Scrapes events from the Museum of Anthropology at UBC in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Museum of Anthropology Events Scraper
 */
const AnthropologyMuseumEvents = {
  name: 'Museum of Anthropology',
  url: 'https://moa.ubc.ca/exhibitions-events/',
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
      
      // Check for date range with "to", "-", "–", or "through"
      const rangeSeparators = [' to ', ' - ', ' – ', ' through ', '–', '-'];
      let isRange = false;
      let separator = '';
      
      for (const sep of rangeSeparators) {
        if (dateString.includes(sep)) {
          isRange = true;
          separator = sep;
          break;
        }
      }
      
      if (isRange) {
        const parts = dateString.split(separator);
        
        if (parts.length !== 2) {
          console.log(`Unexpected date range format: ${dateString}`);
          return { startDate: null, endDate: null };
        }
        
        let startDateStr = parts[0].trim();
        let endDateStr = parts[1].trim();
        
        // Check if the year is only specified at the end of the range
        // Example: "January 15 - February 28, 2023"
        if (!startDateStr.match(/\d{4}/) && endDateStr.match(/\d{4}/)) {
          const yearMatch = endDateStr.match(/\d{4}/);
          if (yearMatch) {
            const year = yearMatch[0];
            startDateStr += `, ${year}`;
          }
        }
        
        // Parse start and end dates individually
        const startDateInfo = this._parseSingleDate(startDateStr);
        const endDateInfo = this._parseSingleDate(endDateStr);
        
        if (startDateInfo && endDateInfo) {
          return { 
            startDate: startDateInfo.date,
            endDate: endDateInfo.date
          };
        }
      }
      
      // Check for ongoing exhibitions (typical format at MOA)
      if (dateString.toLowerCase().includes('ongoing')) {
        const today = new Date();
        // Set end date to 6 months from today for ongoing exhibitions
        const endDate = new Date();
        endDate.setMonth(today.getMonth() + 6);
        
        return {
          startDate: today,
          endDate: endDate
        };
      }
      
      // Try to parse as a single date (for one-day events)
      const dateInfo = this._parseSingleDate(dateString);
      if (dateInfo) {
        // For museum events, if only one date is specified,
        // assume it's a single-day event ending at closing time (5pm)
        const endDate = new Date(dateInfo.date);
        
        if (dateInfo.hasTimeInfo) {
          // If time is specified, set end time to 2 hours after start time
          endDate.setHours(endDate.getHours() + 2);
        } else {
          // Otherwise, set end time to 5pm (typical closing time)
          endDate.setHours(17, 0, 0);
        }
        
        return { 
          startDate: dateInfo.date,
          endDate
        };
      }
      
      console.log(`Could not parse date: ${dateString}`);
      return { startDate: null, endDate: null };
      
    } catch (error) {
      console.error(`Error parsing date "${dateString}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
  },
  
  /**
   * Parse a single date string
   * @param {string} dateString - The date string to parse
   * @returns {Object|null} - Object with parsed date and hasTimeInfo flag, or null if parsing fails
   */
  _parseSingleDate(dateString) {
    if (!dateString) return null;
    
    dateString = dateString.trim();
    let hasTimeInfo = false;
    
    // Format: "Tuesday, July 7, 2025"
    const dayMonthDayYearPattern = /([\w]+),?\s+([\w]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i;
    const dayMonthDayYearMatch = dateString.match(dayMonthDayYearPattern);
    
    if (dayMonthDayYearMatch) {
      const dayName = dayMonthDayYearMatch[1]; // e.g., Tuesday
      const month = dayMonthDayYearMatch[2]; // e.g., July
      const day = parseInt(dayMonthDayYearMatch[3]); // e.g., 7
      // Default to current year if not specified
      const year = dayMonthDayYearMatch[4] ? parseInt(dayMonthDayYearMatch[4]) : new Date().getFullYear();
      
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
        
        let hours = 10; // Default to 10 AM for museum events
        let minutes = 0;
        
        if (timeMatch) {
          hasTimeInfo = true;
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          
          // Convert to 24-hour format
          const isPM = timeMatch[3].toLowerCase() === 'pm';
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        const date = new Date(year, monthNum, day, hours, minutes, 0);
        return { date, hasTimeInfo };
      }
    }
    
    // Format: "July 7, 2025" or "July 7 2025"
    const monthDayYearPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i;
    const monthDayYearMatch = dateString.match(monthDayYearPattern);
    
    if (monthDayYearMatch) {
      const month = monthDayYearMatch[1];
      const day = parseInt(monthDayYearMatch[2]);
      // Default to current year if not specified
      const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3]) : new Date().getFullYear();
      
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
        
        let hours = 10; // Default to 10 AM for museum events
        let minutes = 0;
        
        if (timeMatch) {
          hasTimeInfo = true;
          hours = parseInt(timeMatch[1]);
          minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          
          // Convert to 24-hour format
          const isPM = timeMatch[3].toLowerCase() === 'pm';
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        const date = new Date(year, monthNum, day, hours, minutes, 0);
        return { date, hasTimeInfo };
      }
    }
    
    // Format: "2025-07-07" or "2025/07/07"
    const isoDatePattern = /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/;
    const isoDateMatch = dateString.match(isoDatePattern);
    
    if (isoDateMatch) {
      const year = parseInt(isoDateMatch[1]);
      const month = parseInt(isoDateMatch[2]) - 1; // 0-indexed month
      const day = parseInt(isoDateMatch[3]);
      
      // Check for time information
      const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
      const timeMatch = dateString.match(timePattern);
      
      let hours = 10; // Default to 10 AM for museum events
      let minutes = 0;
      
      if (timeMatch) {
        hasTimeInfo = true;
        hours = parseInt(timeMatch[1]);
        minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }
      
      const date = new Date(year, month, day, hours, minutes, 0);
      return { date, hasTimeInfo };
    }
    
    // Try standard date parsing as a fallback
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      // Check if the original string contained time info
      hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/) !== null || 
                    dateString.match(/\d{1,2}\s*(am|pm)/i) !== null;
      
      // Default to 10 AM for museum events if time not specified
      if (!hasTimeInfo) {
        parsedDate.setHours(10, 0, 0);
      }
      
      return { date: parsedDate, hasTimeInfo };
    }
    
    return null;
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
    
    return `moa-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, eventType) {
    // Determine categories based on event title, description, and event type
    let categories = ['museum', 'art', 'cultural'];
    
    const categoryKeywords = {
      'exhibition': ['exhibition', 'exhibit', 'display', 'gallery', 'showcase', 'installation'],
      'indigenous': ['indigenous', 'first nations', 'aboriginal', 'native', 'haida', 'inuit'],
      'workshop': ['workshop', 'class', 'learn', 'make', 'create', 'hands-on'],
      'performance': ['performance', 'music', 'dance', 'concert', 'show'],
      'talk': ['talk', 'lecture', 'discussion', 'conversation', 'panel', 'speakers'],
      'family': ['family', 'kids', 'children', 'youth', 'parent'],
      'tour': ['tour', 'guided', 'walk'],
      'special': ['special event', 'ceremony', 'celebration', 'festival', 'gala']
    };
    
    const fullText = ((title || '') + ' ' + (description || '') + ' ' + (eventType || '')).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          categories.push(category);
          break;
        }
      }
    }
    
    // Create venue object
    const venue = {
      name: this.name,
      address: '6393 NW Marine Drive',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6T 1Z2',
      website: 'https://moa.ubc.ca',
      googleMapsUrl: 'https://goo.gl/maps/kKVpqgRNixDaYxXZ7'
    };
    
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue,
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'moa'
    };
  },
  
  /**
   * Clean HTML content and extract text
   * @param {string} html - HTML content
   * @returns {string} - Cleaned text
   */
  cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Replace multiple spaces with a single space
      .trim();
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
      
      // Set shorter timeout
      page.setDefaultNavigationTimeout(30000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      
      // First, scrape exhibitions
      const exhibitions = await page.evaluate(() => {
        const exhibitions = [];
        
        // Try different selectors for exhibitions
        const exhibitionElements = Array.from(document.querySelectorAll(
          '.exhibition, .exhibition-item, .event-item, .card, article'
        ));
        
        exhibitionElements.forEach(element => {
          const titleElement = element.querySelector('h2, h3, h4, .title');
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          if (!title) return;
          
          // Extract description
          let description = '';
          const descElement = element.querySelector('.description, .excerpt, p');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Extract date range
          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, .meta, time');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }
          
          // If no specific date element, try to find date in text
          if (!dateText) {
            const text = element.textContent;
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{4}-\d{2}-\d{2}/,
              /ongoing/i
            ];
            
            for (const pattern of datePatterns) {
              const match = text.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }
          
          // Extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Extract URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          // Get event type
          let eventType = 'exhibition';
          
          // Only add if we have at minimum a title and either a date or description
          if (title && (dateText || description.length > 20)) {
            exhibitions.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              eventType
            });
          }
        });
        
        return exhibitions;
      });
      
      console.log(`Found ${exhibitions.length} potential exhibitions`);
      
      // Process each exhibition
      for (const exhibition of exhibitions) {
        // Skip if no date information and not "ongoing"
        if (!exhibition.dateText && !exhibition.description.toLowerCase().includes('ongoing')) {
          console.log(`Skipping exhibition "${exhibition.title}" - no date information found`);
          continue;
        }
        
        // Parse date information
        const dateInfo = this.parseDateRange(exhibition.dateText);
        
        // Skip events with no valid dates unless they're "ongoing"
        if ((!dateInfo.startDate || !dateInfo.endDate) && 
            !exhibition.dateText.toLowerCase().includes('ongoing') && 
            !exhibition.description.toLowerCase().includes('ongoing')) {
          console.log(`Skipping exhibition "${exhibition.title}" - invalid date: "${exhibition.dateText}"`);
          continue;
        }
        
        // Generate a unique event ID
        const eventId = this.generateEventId(exhibition.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          exhibition.title,
          exhibition.description,
          dateInfo.startDate,
          dateInfo.endDate,
          exhibition.imageUrl,
          exhibition.sourceUrl,
          exhibition.eventType
        );
        
        // Add to events array
        events.push(event);
      }
      
      // Now navigate to the events page to get specific events
      const eventsUrl = 'https://moa.ubc.ca/events/';
      console.log(`Navigating to events page: ${eventsUrl}`);
      await page.goto(eventsUrl, { waitUntil: 'networkidle2' });
      
      // Scrape events
      const specificEvents = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event, .event-item, .card, article, .listing'
        ));
        
        eventElements.forEach(element => {
          const titleElement = element.querySelector('h2, h3, h4, .title');
          if (!titleElement) return;
          
          const title = titleElement.textContent.trim();
          if (!title) return;
          
          // Extract description
          let description = '';
          const descElement = element.querySelector('.description, .excerpt, p');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Extract date
          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, .meta, time');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }
          
          // If no specific date element, try to find date in text
          if (!dateText) {
            const text = element.textContent;
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{4}-\d{2}-\d{2}/
            ];
            
            for (const pattern of datePatterns) {
              const match = text.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }
          
          // Extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Extract URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          // Try to determine event type based on content
          let eventType = '';
          const contentText = (title + ' ' + description).toLowerCase();
          if (contentText.includes('workshop')) {
            eventType = 'workshop';
          } else if (contentText.includes('talk') || contentText.includes('lecture')) {
            eventType = 'talk';
          } else if (contentText.includes('tour') || contentText.includes('guided')) {
            eventType = 'tour';
          } else if (contentText.includes('performance') || contentText.includes('music')) {
            eventType = 'performance';
          } else {
            eventType = 'event';
          }
          
          // Only add if we have at minimum a title and either a date or good description
          if (title && (dateText || description.length > 20)) {
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              eventType
            });
          }
        });
        
        return events;
      });
      
      console.log(`Found ${specificEvents.length} potential events`);
      
      // Process each event
      for (const eventData of specificEvents) {
        // Skip if no date information
        if (!eventData.dateText) {
          console.log(`Skipping event "${eventData.title}" - no date information found`);
          continue;
        }
        
        // Parse date information
        const dateInfo = this.parseDateRange(eventData.dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventData.title}" - invalid date: "${eventData.dateText}"`);
          continue;
        }
        
        // Generate a unique event ID
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
          eventData.eventType
        );
        
        // Check if this is a duplicate (same title and date)
        const isDuplicate = events.some(existingEvent => 
          existingEvent.title === event.title && 
          existingEvent.startDate.getTime() === event.startDate.getTime()
        );
        
        // Add event if not a duplicate
        if (!isDuplicate) {
          events.push(event);
        }
      }
      
      console.log(`Found ${events.length} total events from ${this.name}`);
      
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

module.exports = AnthropologyMuseumEvents;
