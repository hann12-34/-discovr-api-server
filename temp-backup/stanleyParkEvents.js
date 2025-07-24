/**
 * Stanley Park Events Scraper
 * Scrapes events from Stanley Park and Vancouver Parks & Recreation
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Stanley Park Events Scraper
 */
const StanleyParkEvents = {
  name: 'Stanley Park',
  url: 'https://vancouver.ca/parks-recreation-culture/stanley-park.aspx',
  eventsUrl: 'https://vancouver.ca/parks-recreation-culture/events-calendar.aspx',
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
      
      // Check for date range with "to" or "-" or "–"
      if (dateString.includes(' to ') || dateString.includes(' - ') || dateString.includes(' – ')) {
        let parts;
        if (dateString.includes(' to ')) {
          parts = dateString.split(' to ');
        } else if (dateString.includes(' - ')) {
          parts = dateString.split(' - ');
        } else {
          parts = dateString.split(' – ');
        }
        
        const startDateStr = parts[0].trim();
        const endDateStr = parts[1].trim();
        
        // Parse start and end dates individually
        const startDateInfo = this._parseSingleDate(startDateStr);
        const endDateInfo = this._parseSingleDate(endDateStr);
        
        if (startDateInfo && endDateInfo) {
          // If both start and end dates are valid
          return { 
            startDate: startDateInfo.date,
            endDate: endDateInfo.date
          };
        }
      }
      
      // Try to parse as a single date
      const dateInfo = this._parseSingleDate(dateString);
      if (dateInfo) {
        // For outdoor events, end time is typically 3 hours after start
        const endDate = new Date(dateInfo.date);
        
        // If event time is specified, add 3 hours for end time
        if (dateInfo.hasTimeInfo) {
          endDate.setHours(endDate.getHours() + 3);
        } 
        // Otherwise, set end date to end of day
        else {
          endDate.setHours(23, 59, 59);
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
        
        let hours = 10; // Default to 10 AM for park events
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
        
        let hours = 10; // Default to 10 AM for park events
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
      
      let hours = 10; // Default to 10 AM for park events
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
      
      // Default to 10 AM for park events if time not specified
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
    
    return `stanley-park-${slug}-${dateStr}`;
  },
  
  /**
   * Extract location information from event content
   * @param {string} content - Event content/description
   * @returns {string} - Location description or empty string
   */
  extractLocation(content) {
    if (!content) return '';
    
    const locationPatterns = [
      /location:\s*([^\.]+)/i,
      /venue:\s*([^\.]+)/i,
      /place:\s*([^\.]+)/i,
      /at\s+the\s+([^\.]+)/i,
      /at\s+Stanley\s+Park([^\.]*)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, location) {
    // Determine categories based on event title and description
    let categories = ['outdoors', 'parks', 'recreation'];
    
    const categoryKeywords = {
      'family': ['family', 'kids', 'children', 'youth', 'parents'],
      'sports': ['sports', 'fitness', 'athletic', 'run', 'race', 'marathon', 'swim', 'bike'],
      'nature': ['nature', 'wildlife', 'bird', 'forest', 'garden', 'tree', 'plant', 'ecology', 'conservation'],
      'tour': ['tour', 'guide', 'walk', 'visit', 'explore', 'discovery'],
      'art': ['art', 'performance', 'music', 'concert', 'theatre', 'exhibit'],
      'cultural': ['cultural', 'indigenous', 'first nations', 'heritage', 'history'],
      'educational': ['education', 'workshop', 'learn', 'class', 'program']
    };
    
    const fullText = (title + ' ' + description).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          categories.push(category);
          break;
        }
      }
    }
    
    // Create venue with more specific location if available
    const venue = {
      name: 'Stanley Park',
      address: '2000 W Georgia St',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6G 2Z9',
      website: 'https://vancouver.ca/parks-recreation-culture/stanley-park.aspx',
      googleMapsUrl: 'https://goo.gl/maps/cVLFpSvvCyQPPsWT8'
    };
    
    // Add specific location to venue name if available
    if (location) {
      venue.name = `Stanley Park - ${location}`;
    }
    
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
      sourceIdentifier: 'stanley-park'
    };
  },
  
  /**
   * Extract clean text from HTML content
   * @param {string} htmlContent - HTML content to clean
   * @returns {string} - Cleaned text
   */
  cleanHtmlContent(htmlContent) {
    if (!htmlContent) return '';
    
    // Remove HTML tags
    let text = htmlContent.replace(/<[^>]*>/g, ' ');
    
    // Replace multiple spaces, newlines with single space
    text = text.replace(/\s+/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#039;/g, "'");
    
    return text.trim();
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
      page.setDefaultNavigationTimeout(20000);
      
      // First check the main Stanley Park page for featured events
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Extract featured events from main page
      const mainPageEvents = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for featured events and content blocks
        const eventElements = Array.from(document.querySelectorAll(
          '.feature, .event-feature, .event-listing, .content-block, .panel, .card'
        ));
        
        eventElements.forEach(element => {
          // Skip elements that are too small
          if (element.offsetHeight < 50) return;
          
          // Try to extract title
          let title = '';
          const titleElement = element.querySelector('h2, h3, h4, .title, .heading');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
          
          if (!title || title.toLowerCase().includes('search') || title.toLowerCase() === 'share') return;
          
          // Try to extract description
          let description = '';
          const descElement = element.querySelector('p, .description, .text');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Try to extract date from text content
          let dateText = '';
          
          // Look for common date formats
          const allText = element.textContent;
          const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
            /\d{1,2}\/\d{1,2}\/\d{4}/,
            /\d{1,2}-\d{1,2}-\d{4}/
          ];
          
          for (const pattern of datePatterns) {
            const match = allText.match(pattern);
            if (match) {
              dateText = match[0];
              break;
            }
          }
          
          // Try to extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Try to extract link
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          if (title && (dateText || description.length > 50)) {
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
      
      console.log(`Found ${mainPageEvents.length} potential events on main page`);
      
      // Process each event from the main page
      for (const eventData of mainPageEvents) {
        // If we have date information
        if (eventData.dateText) {
          const dateInfo = this.parseDateRange(eventData.dateText);
          
          // Skip events with no valid dates
          if (!dateInfo.startDate || !dateInfo.endDate) {
            console.log(`Skipping main page event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
            continue;
          }
          
          // Extract location from description
          const location = this.extractLocation(eventData.description);
          
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
            location
          );
          
          // Add event to events array
          events.push(event);
        }
        // For events without date, but with a link, follow the link to get more info
        else if (eventData.sourceUrl && eventData.sourceUrl.includes('vancouver.ca')) {
          try {
            console.log(`Following link to: ${eventData.sourceUrl}`);
            const eventPage = await browser.newPage();
            await eventPage.setViewport({ width: 1280, height: 800 });
            await eventPage.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 15000 });
            
            // Extract detailed event info
            const eventDetails = await eventPage.evaluate(() => {
              // Try to find date information
              let dateText = '';
              
              // Check for structured date elements
              const dateElement = document.querySelector('.date, .event-date, time, .datetime');
              if (dateElement) {
                dateText = dateElement.textContent.trim();
              } else {
                // Try to extract date from general content
                const content = document.body.textContent;
                const datePatterns = [
                  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
                  /\d{1,2}\/\d{1,2}\/\d{4}/,
                  /\d{1,2}-\d{1,2}-\d{4}/
                ];
                
                for (const pattern of datePatterns) {
                  const match = content.match(pattern);
                  if (match) {
                    dateText = match[0];
                    break;
                  }
                }
              }
              
              // Get a better description if available
              let description = '';
              const descElement = document.querySelector('.description, .content, main p');
              if (descElement) {
                description = descElement.textContent.trim();
              }
              
              // Get a better image if available
              let imageUrl = '';
              const imgElement = document.querySelector('main img, .content img');
              if (imgElement && imgElement.src) {
                imageUrl = imgElement.src;
              }
              
              return {
                dateText,
                description: description || '',
                imageUrl: imageUrl || ''
              };
            });
            
            await eventPage.close();
            
            // Update event data with new details
            if (eventDetails.dateText) {
              eventData.dateText = eventDetails.dateText;
            }
            
            if (eventDetails.description && eventDetails.description.length > eventData.description.length) {
              eventData.description = eventDetails.description;
            }
            
            if (eventDetails.imageUrl && !eventData.imageUrl) {
              eventData.imageUrl = eventDetails.imageUrl;
            }
            
            // Now try to process the event with the updated information
            if (eventData.dateText) {
              const dateInfo = this.parseDateRange(eventData.dateText);
              
              // Skip events with no valid dates
              if (!dateInfo.startDate || !dateInfo.endDate) {
                console.log(`Skipping linked event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
                continue;
              }
              
              // Extract location from description
              const location = this.extractLocation(eventData.description);
              
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
                location
              );
              
              // Add event to events array
              events.push(event);
            }
          } catch (error) {
            console.error(`Error following link for event "${eventData.title}": ${error.message}`);
          }
        }
      }
      
      // Now check the main events calendar for park-related events
      console.log(`Navigating to events calendar: ${this.eventsUrl}`);
      await page.goto(this.eventsUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Extract events from the calendar page
      const calendarEvents = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.event-item, .event, .listing-item, .calendar-item, .col-sm-6'
        ));
        
        eventElements.forEach(element => {
          // Try to extract title
          let title = '';
          const titleElement = element.querySelector('h2, h3, h4, .title, .heading');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
          
          if (!title) return;
          
          // Skip non-Stanley Park events
          const elementText = element.textContent.toLowerCase();
          if (!elementText.includes('stanley park') && !elementText.includes('lost lagoon') && 
              !elementText.includes('second beach') && !elementText.includes('third beach') &&
              !elementText.includes('aquarium') && !elementText.includes('seawall') && 
              !elementText.includes('prospect point') && !elementText.includes('brockton point')) {
            return;
          }
          
          // Try to extract description
          let description = '';
          const descElement = element.querySelector('p, .description, .text');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Try to extract date
          let dateText = '';
          const dateElement = element.querySelector('.date, time, .datetime');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          } else {
            // Look for date formats in the text
            const allText = element.textContent;
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
              /\d{1,2}\/\d{1,2}\/\d{4}/,
              /\d{1,2}-\d{1,2}-\d{4}/
            ];
            
            for (const pattern of datePatterns) {
              const match = allText.match(pattern);
              if (match) {
                dateText = match[0];
                break;
              }
            }
          }
          
          // Try to extract image
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Try to extract link
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          if (title && dateText) {
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
      
      console.log(`Found ${calendarEvents.length} potential Stanley Park events in calendar`);
      
      // Process each event from the calendar
      for (const eventData of calendarEvents) {
        const dateInfo = this.parseDateRange(eventData.dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping calendar event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
          continue;
        }
        
        // Extract location from description
        const location = this.extractLocation(eventData.description);
        
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
          location
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

module.exports = StanleyParkEvents;
