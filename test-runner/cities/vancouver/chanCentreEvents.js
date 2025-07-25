/**
 * Chan Centre for the Performing Arts Events Scraper
 * Scrapes events from the Chan Centre at UBC in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Chan Centre Events Scraper
 */
const ChanCentreEvents = {
  name: 'Chan Centre for the Performing Arts',
  url: 'https://chancentre.com/events/',
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
      
      // Look for time pattern first and handle separately
      const timeMatch = dateString.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
      let timeHours = 0;
      let timeMinutes = 0;
      
      if (timeMatch) {
        timeHours = parseInt(timeMatch[1]);
        timeMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && timeHours < 12) timeHours += 12;
        if (!isPM && timeHours === 12) timeHours = 0;
      }
      
      // Check for ISO date format (YYYY-MM-DD)
      if (/\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const isoDateMatch = dateString.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoDateMatch) {
          const startDate = new Date(isoDateMatch[1]);
          
          if (!isNaN(startDate.getTime())) {
            startDate.setHours(timeHours, timeMinutes, 0);
            
            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59); // Default to end of day
            
            return { startDate, endDate };
          }
        }
      }
      
      // Match month formats like "January 15, 2025"
      const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const singleMatch = dateString.match(singleDatePattern);
      
      if (singleMatch) {
        const month = singleMatch[1];
        const day = parseInt(singleMatch[2]);
        const year = parseInt(singleMatch[3]);
        
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
      
      // Match patterns like "January 15 - 20, 2025" 
      const sameMonthPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–—-]\s*)(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const sameMonthMatch = dateString.match(sameMonthPattern);
      
      if (sameMonthMatch) {
        const month = sameMonthMatch[1];
        const startDay = parseInt(sameMonthMatch[2]);
        const endDay = parseInt(sameMonthMatch[3]);
        const year = parseInt(sameMonthMatch[4]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, startDay, timeHours, timeMinutes);
          const endDate = new Date(year, monthNum, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match full date range like "January 15 - February 20, 2025"
      const fullDateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–—-]\s*)([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const fullMatch = dateString.match(fullDateRangePattern);
      
      if (fullMatch) {
        const startMonth = fullMatch[1];
        const startDay = parseInt(fullMatch[2]);
        const endMonth = fullMatch[3];
        const endDay = parseInt(fullMatch[4]);
        const year = parseInt(fullMatch[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay, timeHours, timeMinutes);
          const endDate = new Date(year, endMonthNum, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try to extract just a date in format "MMM DD" for current year
      const currentYearPattern = /([A-Za-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const currentYearMatch = dateString.match(currentYearPattern);
      
      if (currentYearMatch) {
        const month = currentYearMatch[1];
        const day = parseInt(currentYearMatch[2]);
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
      
      // Try to parse as a standard date string
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
        startDate.setHours(timeHours, timeMinutes, 0);
        
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
    }
    
    const slug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    }).substring(0, 50);
    
    return `chan-centre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   * @param {string} id - Event ID
   * @param {string} title - Event title
   * @param {string} description - Event description
   * @param {Date} startDate - Event start date
   * @param {Date} endDate - Event end date
   * @param {string} imageUrl - URL to event image
   * @param {string} sourceUrl - URL to original event page
   * @returns {Object} - Event object
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
        name: 'Chan Centre for the Performing Arts',
        address: '6265 Crescent Road',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6T 1Z1',
        website: 'https://chancentre.com/',
        googleMapsUrl: 'https://goo.gl/maps/5CNSoY8cRyH7bHAS8'
      },
      categories: [
        'arts',
        'music',
        'performance',
        'concert',
        'theatre'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'chan-centre'
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
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(20000);
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      });
      
      // Wait for events to load
      try {
        await page.waitForSelector('.event, .event-item, article, .event-list-item', { timeout: 10000 });
      } catch (error) {
        console.log('Could not find event elements using standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      console.log('Extracting events data...');
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Look for event elements with various possible selectors
        const eventElements = Array.from(document.querySelectorAll('.event, .event-item, article, .event-list-item, .event-preview'));
        
        eventElements.forEach(element => {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, .title, .event-title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          if (!title) return; // Skip events without titles
          
          // Extract description
          const descriptionElement = element.querySelector('p, .description, .excerpt, .summary');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('.date, .event-date, time, .datetime');
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          
          // Extract image URL
          let imageUrl = '';
          const imageElement = element.querySelector('img');
          if (imageElement && imageElement.src) {
            imageUrl = imageElement.src;
          }
          
          // Extract source URL
          let sourceUrl = '';
          const linkElement = element.querySelector('a[href]');
          if (linkElement && linkElement.href) {
            sourceUrl = linkElement.href;
          }
          
          // Only add events with title
          if (title) {
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
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event
      for (const eventData of eventsData) {
        const { title, description, dateText, imageUrl, sourceUrl } = eventData;
        
        let eventDetails = {
          title,
          description,
          dateText,
          imageUrl,
          sourceUrl
        };
        
        // If we have a source URL, visit the detail page to get more information
        if (sourceUrl) {
          console.log(`Visiting event detail page: ${sourceUrl}`);
          
          try {
            await page.goto(sourceUrl, { 
              waitUntil: 'networkidle2', 
              timeout: 15000 
            });
            
            // Extract detailed event information
            const detailData = await page.evaluate(() => {
              // Extract title
              const title = document.querySelector('h1, .event-title, .title')?.textContent.trim() || '';
              
              // Extract description
              const descriptionElement = document.querySelector('.event-description, .description, .content');
              const description = descriptionElement ? descriptionElement.textContent.trim() : '';
              
              // Extract date
              const dateElement = document.querySelector('.event-date, .date, time, .datetime');
              const dateText = dateElement ? dateElement.textContent.trim() : '';
              
              // Try to find date in other elements if not found
              if (!dateText) {
                // Look for date patterns in the page text
                const pageText = document.body.textContent;
                const datePatterns = [
                  /(?:date|when):\s*([^\n]+)/i,
                  /(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4})/i,
                  /(\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i
                ];
                
                for (const pattern of datePatterns) {
                  const match = pageText.match(pattern);
                  if (match && match[1]) {
                    return {
                      title,
                      description,
                      dateText: match[1].trim(),
                      imageUrl: document.querySelector('.event-image img, .featured-image img')?.src || ''
                    };
                  }
                }
              }
              
              return {
                title,
                description,
                dateText,
                imageUrl: document.querySelector('.event-image img, .featured-image img')?.src || ''
              };
            });
            
            // Update event details with more complete information from the detail page
            if (detailData.title) eventDetails.title = detailData.title;
            if (detailData.description) eventDetails.description = detailData.description;
            if (detailData.dateText) eventDetails.dateText = detailData.dateText;
            if (detailData.imageUrl) eventDetails.imageUrl = detailData.imageUrl;
          } catch (error) {
            console.log(`Error accessing event detail page: ${error.message}`);
          }
        }
        
        // Parse date information
        const dateInfo = this.parseDateRange(eventDetails.dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${eventDetails.title}" due to invalid date: "${eventDetails.dateText}"`);
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(eventDetails.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          eventDetails.title,
          eventDetails.description,
          dateInfo.startDate,
          dateInfo.endDate,
          eventDetails.imageUrl,
          eventDetails.sourceUrl || this.url
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

module.exports = ChanCentreEvents;
