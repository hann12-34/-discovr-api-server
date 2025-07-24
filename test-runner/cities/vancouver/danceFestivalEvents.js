/**
 * Vancouver International Dance Festival Events Scraper
 * Scrapes events from the Vancouver International Dance Festival
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver International Dance Festival Events Scraper
 */
const DanceFestivalEvents = {
  name: 'Vancouver International Dance Festival',
  url: 'https://vidf.ca/performances/',
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
      
      // Check for date range with "to", "-", "–" or similar
      if (dateString.includes(' to ') || dateString.includes(' - ') || 
          dateString.includes(' – ') || dateString.includes('—')) {
        
        let parts;
        if (dateString.includes(' to ')) {
          parts = dateString.split(' to ');
        } else if (dateString.includes(' - ')) {
          parts = dateString.split(' - ');
        } else if (dateString.includes(' – ')) {
          parts = dateString.split(' – ');
        } else if (dateString.includes('—')) {
          parts = dateString.split('—');
        }
        
        if (parts && parts.length === 2) {
          let startDateStr = parts[0].trim();
          let endDateStr = parts[1].trim();
          
          // If the year is only mentioned at the end of the range
          if (!startDateStr.match(/\d{4}/) && endDateStr.match(/\d{4}/)) {
            const yearMatch = endDateStr.match(/\d{4}/);
            if (yearMatch) {
              const year = yearMatch[0];
              startDateStr = `${startDateStr} ${year}`;
            }
          }
          
          const startDateInfo = this._parseSingleDate(startDateStr);
          const endDateInfo = this._parseSingleDate(endDateStr);
          
          if (startDateInfo && endDateInfo) {
            return { 
              startDate: startDateInfo.date,
              endDate: endDateInfo.date
            };
          }
        }
      }
      
      // Try to parse as a single date
      const dateInfo = this._parseSingleDate(dateString);
      if (dateInfo) {
        const endDate = new Date(dateInfo.date);
        
        // If performance time is specified, add duration (typically ~2 hours)
        if (dateInfo.hasTimeInfo) {
          endDate.setHours(endDate.getHours() + 2);
        } 
        // Otherwise set end time to end of day
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
    
    // Format: "Tuesday, July 7, 2025" or "Tuesday July 7 2025"
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
        
        let hours = 19; // Default to 7 PM for dance performances
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
        
        let hours = 19; // Default to 7 PM for dance performances
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
    
    // Try standard date parsing as a fallback
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      // Check if the original string contained time info
      hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/) !== null || 
                    dateString.match(/\d{1,2}\s*(am|pm)/i) !== null;
      
      // Default to 7 PM for dance performances if time not specified
      if (!hasTimeInfo) {
        parsedDate.setHours(19, 0, 0);
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
    
    return `vidf-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, venue) {
    // Determine categories based on event title and description
    let categories = ['dance', 'performance', 'arts', 'festival'];
    
    const categoryKeywords = {
      'contemporary': ['contemporary', 'modern'],
      'ballet': ['ballet', 'classical'],
      'international': ['international', 'world', 'cultural'],
      'workshop': ['workshop', 'class', 'masterclass'],
      'family': ['family', 'all-ages']
    };
    
    const fullText = ((title || '') + ' ' + (description || '')).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          categories.push(category);
          break;
        }
      }
    }
    
    // Default venue is the Roundhouse Community Arts & Recreation Centre
    const defaultVenue = {
      name: 'Roundhouse Community Arts & Recreation Centre',
      address: '181 Roundhouse Mews',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6Z 2W3',
      website: 'https://vidf.ca',
      googleMapsUrl: 'https://goo.gl/maps/j2iYjXZqTLcZdvZZ7'
    };
    
    // Use provided venue or default
    const eventVenue = venue || defaultVenue;
    
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue: eventVenue,
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'vidf'
    };
  },
  
  /**
   * Extract venue information from event text
   * @param {string} text - Text that might contain venue information
   * @returns {Object|null} - Venue object if found, null otherwise
   */
  extractVenue(text) {
    if (!text) return null;
    
    // Common venues for the festival
    const venues = [
      {
        keywords: ['roundhouse', 'community arts', 'recreation centre'],
        name: 'Roundhouse Community Arts & Recreation Centre',
        address: '181 Roundhouse Mews',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 2W3',
        website: 'https://vidf.ca',
        googleMapsUrl: 'https://goo.gl/maps/j2iYjXZqTLcZdvZZ7'
      },
      {
        keywords: ['scotiabank dance centre', 'dance centre'],
        name: 'Scotiabank Dance Centre',
        address: '677 Davie St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 2G6',
        website: 'https://vidf.ca',
        googleMapsUrl: 'https://goo.gl/maps/bNvThEQDsi4W8TL38'
      },
      {
        keywords: ['vancouver playhouse'],
        name: 'Vancouver Playhouse',
        address: '600 Hamilton St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 2P1',
        website: 'https://vidf.ca',
        googleMapsUrl: 'https://goo.gl/maps/KbidxJixaxTo8YLK9'
      }
    ];
    
    const lowerText = text.toLowerCase();
    
    for (const venue of venues) {
      for (const keyword of venue.keywords) {
        if (lowerText.includes(keyword)) {
          return venue;
        }
      }
    }
    
    return null;
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
      
      // Extract performances
      const performances = await page.evaluate(() => {
        const performances = [];
        
        // Try different selectors for performances
        const performanceElements = Array.from(document.querySelectorAll(
          '.performance, .event, .show, article, .card, .program-item, .event-item'
        ));
        
        performanceElements.forEach(element => {
          // Extract title
          let title = '';
          const titleElement = element.querySelector('h2, h3, h4, .title, .heading');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
          
          if (!title) return;
          
          // Extract description
          let description = '';
          const descElement = element.querySelector('p, .description, .excerpt, .content');
          if (descElement) {
            description = descElement.textContent.trim();
          }
          
          // Extract date
          let dateText = '';
          const dateElement = element.querySelector('.date, .dates, time, .schedule');
          if (dateElement) {
            dateText = dateElement.textContent.trim();
          }
          
          // If no date element found, search in the text
          if (!dateText) {
            const text = element.textContent;
            
            // Look for common date patterns
            const datePatterns = [
              /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i,
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
          
          // Extract venue information from text
          const venueInfo = element.textContent;
          
          // Skip items without essential information
          if (title && (dateText || description.length > 20)) {
            performances.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              venueInfo
            });
          }
        });
        
        return performances;
      });
      
      console.log(`Found ${performances.length} potential performances`);
      
      // Process performances
      for (const performance of performances) {
        // Skip if no date and very short description
        if (!performance.dateText && performance.description.length < 20) {
          console.log(`Skipping performance "${performance.title}" - insufficient information`);
          continue;
        }
        
        // Parse date
        const dateInfo = this.parseDateRange(performance.dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping performance "${performance.title}" - invalid date: "${performance.dateText}"`);
          continue;
        }
        
        // Extract venue from description
        const venue = this.extractVenue(performance.venueInfo || performance.description);
        
        // Generate event ID
        const eventId = this.generateEventId(performance.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          performance.title,
          performance.description,
          dateInfo.startDate,
          dateInfo.endDate,
          performance.imageUrl,
          performance.sourceUrl,
          venue
        );
        
        // Add to events array
        events.push(event);
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

module.exports = DanceFestivalEvents;
