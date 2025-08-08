const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * H.R. MacMillan Space Centre Events Scraper
 * Scrapes events from H.R. MacMillan Space Centre in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Space Centre Events Scraper
 */
const SpaceCentreEvents = {
  name: 'H.R. MacMillan Space Centre',
  url: 'https://www.spacecentre.ca/events/',
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
        // For regular events, end time is typically 2 hours after start
        const endDate = new Date(dateInfo.date);
        
        // If event time is specified, add 2 hours for end time
        if (dateInfo.hasTimeInfo) {
          endDate.setHours(endDate.getHours() + 2);
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
    
    // Format: "July 15, 2025" or "July 15 2025"
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
        
        let hours = 10; // Default to 10 AM for space centre events
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
    
    // Format: "7/15/2025" or "7-15-2025"
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
      
      let hours = 10; // Default to 10 AM for space centre events
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
      
      // Default to 10 AM for space centre events if time not specified
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
    
    return `space-centre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
    // Determine categories based on event title and description
    let categories = ['education', 'science', 'family-friendly'];
    
    const categoryKeywords = {
      'astronomy': ['astronomy', 'star', 'planet', 'galaxy', 'space', 'telescope', 'cosmic'],
      'kids': ['kids', 'children', 'family', 'young'],
      'workshop': ['workshop', 'hands-on', 'interactive', 'learn'],
      'special-event': ['special', 'featured', 'celebration'],
      'lecture': ['lecture', 'talk', 'presentation', 'speaker']
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
    
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue: {
        name: 'H.R. MacMillan Space Centre',
        address: '1100 Chestnut Street',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6J 3J9',
        website: 'https://www.spacecentre.ca/',
        googleMapsUrl: 'https://goo.gl/maps/4qU58u81UBBxuQSC7'
      },
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'space-centre'
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
      page.setDefaultNavigationTimeout(15000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 15000 });
      
      // Wait for events to load
      try {
        await page.waitForSelector('.event, .event-item, .tribe-events-list-event-title, article.type-event', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events (Space Centre likely uses The Events Calendar plugin)
        const eventElements = Array.from(document.querySelectorAll(
          '.event, .event-item, article.type-event, .tribe-events-list-event, .elementor-post'
        ));
        
        eventElements.forEach(element => {
          // Try to extract title
          let title = '';
          const titleElement = element.querySelector('.event-title, h2, h3, .tribe-events-list-event-title, .elementor-post__title');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
          
          if (!title) return;
          
          // Try to extract description
          let description = '';
          const descElement = element.querySelector('.event-description, .description, .tribe-events-list-event-description, .elementor-post__excerpt');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Try to extract date
          let dateText = '';
          const dateElement = element.querySelector('.event-date, .date, .tribe-event-date-start, .elementor-post-date');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }
          
          // For events with separate start and end date elements
          const startDateElement = element.querySelector('.tribe-event-date-start');
          const endDateElement = element.querySelector('.tribe-event-date-end');
          if (startDateElement && endDateElement) {
            dateText = `${startDateElement.textContent.trim()} to ${endDateElement.textContent.trim()}`;
          }
          
          // Try to extract image URL
          let imageUrl = '';
          const imgElement = element.querySelector('img');
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
          }
          
          // Try to extract link URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          events.push({
            title,
            description,
            dateText,
            imageUrl,
            sourceUrl
          });
        });
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event data
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
        
        // Add event to events array
        events.push(event);
      }
      
      // If no events found with list view, try to look for individual featured events
      if (events.length === 0) {
        console.log('No events found with primary selectors, trying alternative approach...');
        
        // Try to extract featured events or any event-like sections
        const featuredEventsData = await page.evaluate(() => {
          const events = [];
          
          // Look for featured events or prominent content blocks
          const featuredElements = Array.from(document.querySelectorAll(
            '.featured-event, .elementor-widget, section, .main-content > div'
          ));
          
          featuredElements.forEach(element => {
            // Skip elements that are too small or likely not event containers
            if (element.offsetHeight < 100) return;
            
            // Try to extract title
            let title = '';
            const titleElement = element.querySelector('h1, h2, h3, h4, .title');
            if (titleElement) {
              title = titleElement.textContent.trim();
              if (!title || title.toLowerCase().includes('subscribe') || title.toLowerCase().includes('newsletter')) {
                return; // Skip non-events or subscription blocks
              }
            } else {
              return; // No title, likely not an event
            }
            
            // Try to extract description
            let description = '';
            const paragraphs = element.querySelectorAll('p');
            if (paragraphs.length > 0) {
              // Combine up to 3 paragraphs for description
              const descTexts = Array.from(paragraphs).slice(0, 3).map(p => p.textContent.trim());
              description = descTexts.join(' ');
            }
            
            // Try to extract date
            let dateText = '';
            // Look for date patterns in text
            const allText = element.textContent;
            
            // Common date formats
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
            
            // Try to extract image URL
            let imageUrl = '';
            const imgElement = element.querySelector('img');
            if (imgElement && imgElement.src) {
              imageUrl = imgElement.src;
            }
            
            // Try to extract link URL
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
        
        console.log(`Found ${featuredEventsData.length} potential featured events`);
        
        // Process each featured event
        for (const eventData of featuredEventsData) {
          // Parse date information
          const dateInfo = this.parseDateRange(eventData.dateText);
          
          // Skip events with no valid dates
          if (!dateInfo.startDate || !dateInfo.endDate) {
            console.log(`Skipping featured event "${eventData.title}" due to invalid date: "${eventData.dateText}"`);
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
          
          // Add event to events array
          events.push(event);
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
};

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new SpaceCentreEvents();
