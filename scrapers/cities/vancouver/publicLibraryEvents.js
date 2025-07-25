/**
 * Vancouver Public Library Events Scraper
 * Scrapes events from Vancouver Public Library
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver Public Library Events Scraper
 */
const PublicLibraryEvents = {
  name: 'Vancouver Public Library',
  url: 'https://www.vpl.ca/events',
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
        // For library events, end time is typically 1.5 hours after start
        const endDate = new Date(dateInfo.date);
        
        // If event time is specified, add 1.5 hours for end time
        if (dateInfo.hasTimeInfo) {
          endDate.setMinutes(endDate.getMinutes() + 90);
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
    
    // VPL specific format: "Tuesday, July 7, 2025 - 2:00pm to 3:30pm"
    const vplFormatPattern = /([\w]+), ([\w]+) (\d{1,2}), (\d{4})(?:.+?(\d{1,2}):(\d{2})(?:am|pm))?/i;
    const vplFormatMatch = dateString.match(vplFormatPattern);
    
    if (vplFormatMatch) {
      const day = vplFormatMatch[1]; // e.g., Tuesday
      const month = vplFormatMatch[2]; // e.g., July
      const dayNum = parseInt(vplFormatMatch[3]); // e.g., 7
      const year = parseInt(vplFormatMatch[4]); // e.g., 2025
      
      const months = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11
      };
      
      const monthNum = months[month.toLowerCase()];
      
      if (monthNum !== undefined) {
        // Check for time information
        let hours = 12; // Default to noon for library events
        let minutes = 0;
        
        // If specific time info is in the match
        if (vplFormatMatch[5]) {
          hasTimeInfo = true;
          hours = parseInt(vplFormatMatch[5]);
          minutes = parseInt(vplFormatMatch[6]);
          
          // Check if PM based on original string
          const isPM = dateString.toLowerCase().includes(hours + ':' + vplFormatMatch[6] + 'pm');
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        } else {
          // Look for time elsewhere in the string
          const timePattern = /(\d{1,2}):(\d{2})(am|pm)/i;
          const timeMatch = dateString.match(timePattern);
          
          if (timeMatch) {
            hasTimeInfo = true;
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
        }
        
        const date = new Date(year, monthNum, dayNum, hours, minutes, 0);
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
        const timePattern = /(\d{1,2}):(\d{2})(am|pm)/i;
        const timeMatch = dateString.match(timePattern);
        
        let hours = 12; // Default to noon for library events
        let minutes = 0;
        
        if (timeMatch) {
          hasTimeInfo = true;
          hours = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
          
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
      const timePattern = /(\d{1,2}):(\d{2})(am|pm)/i;
      const timeMatch = dateString.match(timePattern);
      
      let hours = 12; // Default to noon for library events
      let minutes = 0;
      
      if (timeMatch) {
        hasTimeInfo = true;
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        
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
      
      // Default to noon for library events if time not specified
      if (!hasTimeInfo) {
        parsedDate.setHours(12, 0, 0);
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
    
    return `vpl-${slug}-${dateStr}`;
  },
  
  /**
   * Extract library branch from event location text
   * @param {string} locationText - Location text from event
   * @returns {string} - Branch name or empty string
   */
  extractBranchName(locationText) {
    if (!locationText) return '';
    
    // Common VPL branch names
    const branches = [
      'Central Library',
      'Britannia',
      'Carnegie',
      'Champlain Heights',
      'Collingwood',
      'Dunbar',
      'Firehall',
      'Fraserview',
      'Hastings',
      'Joe Fortes',
      'Kensington',
      'Kerrisdale',
      'Kitsilano',
      'Marpole',
      'Mount Pleasant',
      'nə́c̓aʔmat ct',
      'Oakridge',
      'Renfrew',
      'South Hill',
      'Terry Salman',
      'West Point Grey'
    ];
    
    for (const branch of branches) {
      if (locationText.includes(branch)) {
        return branch;
      }
    }
    
    return '';
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, branchName) {
    // Determine categories based on event title and description
    let categories = ['education', 'community'];
    
    const categoryKeywords = {
      'kids': ['kids', 'children', 'family', 'young', 'teen', 'youth', 'storytime'],
      'books': ['book', 'reading', 'author', 'literature', 'novel', 'poetry'],
      'workshop': ['workshop', 'hands-on', 'interactive', 'learn', 'class'],
      'technology': ['tech', 'digital', 'computer', 'internet', 'coding'],
      'seniors': ['senior', 'older adult', 'elder'],
      'arts-and-culture': ['art', 'culture', 'craft', 'exhibition', 'display'],
      'language': ['language', 'esl', 'english', 'literacy', 'conversation'],
      'health': ['health', 'wellness', 'mental health', 'fitness']
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
    
    // Create venue object, use branch info if available
    const venue = {
      name: 'Vancouver Public Library',
      address: '350 W Georgia St',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6B 6B1',
      website: 'https://www.vpl.ca/',
      googleMapsUrl: 'https://goo.gl/maps/ShwQjyMzYd2vBUsR8'
    };
    
    // Modify venue for specific branches
    if (branchName) {
      venue.name = `Vancouver Public Library - ${branchName}`;
      
      // Update address based on branch (for common branches)
      if (branchName === 'Central Library') {
        venue.address = '350 W Georgia St';
        venue.postalCode = 'V6B 6B1';
        venue.googleMapsUrl = 'https://goo.gl/maps/ShwQjyMzYd2vBUsR8';
      } else if (branchName === 'Kitsilano') {
        venue.address = '2425 Macdonald St';
        venue.postalCode = 'V6K 3Y9';
        venue.googleMapsUrl = 'https://goo.gl/maps/ZLMZSzogGMrVX4BS6';
      } else if (branchName === 'Mount Pleasant') {
        venue.address = '1 Kingsway';
        venue.postalCode = 'V5T 3H7';
        venue.googleMapsUrl = 'https://goo.gl/maps/6usFBArb5cAAzT9Z9';
      }
      // Add more branches as needed
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
      sourceIdentifier: 'vancouver-public-library'
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
        await page.waitForSelector('.views-row, .event-item, .event, .views-field', { timeout: 8000 });
      } catch (error) {
        console.log('Could not find event elements with standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try different selectors for events (VPL likely uses Drupal with Views)
        const eventElements = Array.from(document.querySelectorAll(
          '.views-row, .event-item, .event, .views-field'
        ));
        
        eventElements.forEach(element => {
          // Try to extract title
          let title = '';
          const titleElement = element.querySelector('.event-title, h2, h3, .field-content a, .views-field-title');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
          
          if (!title) return;
          
          // Try to extract description
          let description = '';
          const descElement = element.querySelector('.event-description, .field-event-description, .views-field-body, .views-field-field-description');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Try to extract date
          let dateText = '';
          const dateElement = element.querySelector('.date-display-single, .date, .datetime, .views-field-field-date, .views-field-field-event-date');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }
          
          // Try to extract location/branch
          let location = '';
          const locationElement = element.querySelector('.location, .branch, .views-field-field-branch, .views-field-field-location');
          if (locationElement) {
            location = locationElement.textContent.trim();
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
            location,
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
        
        // Extract branch name from location
        const branchName = this.extractBranchName(eventData.location);
        
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
          branchName
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

module.exports = PublicLibraryEvents;
