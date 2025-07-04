/**
 * H.R. MacMillan Space Centre Events Scraper
 * Scrapes events from the H.R. MacMillan Space Centre in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * MacMillan Space Centre Events Scraper
 */
const MacMillanSpaceCentreEvents = {
  name: 'H.R. MacMillan Space Centre',
  url: 'https://www.spacecentre.ca/events/',
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
      
      // Try to handle more date formats with Date.parse
      const dateParts = dateString.split(/\s*[–—-]\s*/);
      if (dateParts.length > 0) {
        // Try to parse the first part as a date
        const startDateStr = dateParts[0].trim();
        let startDate;
        
        // Check for ISO format first
        if (/^\d{4}-\d{2}-\d{2}/.test(startDateStr)) {
          startDate = new Date(startDateStr);
        }
        // Check for month day, year format
        else {
          // Match patterns like "January 15, 2025" or "Jan 15 2025"
          const datePattern = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s+)?(\d{4})/i;
          const match = startDateStr.match(datePattern);
          
          if (match) {
            const month = match[1];
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            
            const months = {
              january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
              april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
              august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
              november: 10, nov: 10, december: 11, dec: 11
            };
            
            const monthNum = months[month.toLowerCase()];
            
            if (monthNum !== undefined) {
              startDate = new Date(year, monthNum, day);
            }
          } else {
            // Try to parse with Date constructor
            startDate = new Date(startDateStr);
          }
        }
        
        // If we have a valid start date
        if (startDate && !isNaN(startDate.getTime())) {
          let endDate;
          
          if (dateParts.length > 1) {
            const endDateStr = dateParts[1].trim();
            
            // Check if the end part is just a day (e.g., "January 15 - 20, 2025")
            if (/^\d{1,2}(st|nd|rd|th)?$/i.test(endDateStr)) {
              const day = parseInt(endDateStr);
              endDate = new Date(startDate);
              endDate.setDate(day);
            }
            // Check if it's a day and year (e.g., "January 15 - 20, 2025")
            else if (/^(\d{1,2})(st|nd|rd|th)?,?\s+(\d{4})$/i.test(endDateStr)) {
              const match = endDateStr.match(/^(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
              const day = parseInt(match[1]);
              const year = parseInt(match[2]);
              endDate = new Date(startDate);
              endDate.setDate(day);
              endDate.setFullYear(year);
            }
            // Check if it's a month and day (e.g., "January 15 - February 20, 2025")
            else if (/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+)?(\d{4})?$/i.test(endDateStr)) {
              const match = endDateStr.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+)?(\d{4})?$/i);
              const month = match[1];
              const day = parseInt(match[2]);
              const year = match[3] ? parseInt(match[3]) : startDate.getFullYear();
              
              const months = {
                january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
                april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
                august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
                november: 10, nov: 10, december: 11, dec: 11
              };
              
              const monthNum = months[month.toLowerCase()];
              
              if (monthNum !== undefined) {
                endDate = new Date(year, monthNum, day);
              }
            }
            // Otherwise try to parse the end date as a full date
            else {
              endDate = new Date(endDateStr);
            }
          }
          
          // If no valid end date, use the start date as end date
          if (!endDate || isNaN(endDate.getTime())) {
            endDate = new Date(startDate);
          }
          
          // Set end date to end of day
          endDate.setHours(23, 59, 59);
          
          return { startDate, endDate };
        }
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
    
    return `space-centre-${slug}-${dateStr}`;
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
        name: 'H.R. MacMillan Space Centre',
        address: '1100 Chestnut Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6J 3J9',
        website: 'https://www.spacecentre.ca/',
        googleMapsUrl: 'https://goo.gl/maps/NmX1wTSiAzLD1etJ8'
      },
      categories: [
        'science',
        'space',
        'education',
        'museum',
        'family'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'space-centre'
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
        waitUntil: 'domcontentloaded', 
        timeout: 20000 
      });
      
      // Wait for events to load
      try {
        await page.waitForSelector('.event, .events-list, article, .event-item', { timeout: 5000 });
      } catch (error) {
        console.log('Could not find event elements using standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      console.log('Extracting events data...');
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Look for event elements with various possible selectors
        const eventElements = Array.from(document.querySelectorAll('.event, .events-list article, .event-item, .tribe-events-calendar-list__event'));
        
        eventElements.forEach(element => {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, .tribe-events-calendar-list__event-title, .event-title, .title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          if (!title) return; // Skip events without titles
          
          // Extract description
          const descriptionElement = element.querySelector('p, .description, .event-description, .tribe-events-calendar-list__event-description');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('.date, .event-date, .tribe-event-date-start, .tribe-events-calendar-list__event-date-tag');
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
          
          // Only add events with both title and date
          if (title && (dateText || description)) {
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
        
        // Parse date information
        const dateInfo = this.parseDateRange(dateText);
        
        // Skip events with no valid dates
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Skipping event "${title}" due to invalid date: "${dateText}"`);
          
          // If we have a source URL for the event, try to visit the page to get more date info
          if (sourceUrl) {
            console.log(`Trying to extract date from event page: ${sourceUrl}`);
            
            try {
              await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
              
              // Try to extract date from the event detail page
              const detailDateText = await page.evaluate(() => {
                const dateElement = document.querySelector('.date, .event-date, .tribe-events-schedule, time');
                return dateElement ? dateElement.textContent.trim() : '';
              });
              
              if (detailDateText) {
                const detailDateInfo = this.parseDateRange(detailDateText);
                
                if (detailDateInfo.startDate && detailDateInfo.endDate) {
                  console.log(`Found date on detail page: ${detailDateText}`);
                  
                  // Generate event ID
                  const eventId = this.generateEventId(title, detailDateInfo.startDate);
                  
                  // Get a more detailed description if available
                  const detailDescription = await page.evaluate(() => {
                    const descElement = document.querySelector('.event-description, .tribe-events-content, .content');
                    return descElement ? descElement.textContent.trim() : '';
                  });
                  
                  // Get a better image if available
                  const detailImage = await page.evaluate(() => {
                    const imgElement = document.querySelector('.event-image img, .tribe-events-event-image img, .featured-image img');
                    return imgElement ? imgElement.src : '';
                  });
                  
                  // Create event object
                  const event = this.createEventObject(
                    eventId,
                    title,
                    detailDescription || description,
                    detailDateInfo.startDate,
                    detailDateInfo.endDate,
                    detailImage || imageUrl,
                    sourceUrl
                  );
                  
                  // Add event to events array
                  events.push(event);
                  continue;
                }
              }
            } catch (error) {
              console.log(`Error accessing event detail page: ${error.message}`);
            }
          }
          
          continue;
        }
        
        // Generate event ID
        const eventId = this.generateEventId(title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          title,
          description,
          dateInfo.startDate,
          dateInfo.endDate,
          imageUrl,
          sourceUrl
        );
        
        // Add event to events array
        events.push(event);
      }
      
      // If no events found, check if there's a calendar page
      if (events.length === 0) {
        const calendarUrl = 'https://www.spacecentre.ca/calendar/';
        console.log(`No events found, checking calendar page: ${calendarUrl}`);
        
        try {
          await page.goto(calendarUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          
          // Wait for calendar events to load
          try {
            await page.waitForSelector('.calendar-event, .tribe-events-calendar-month__day-cell, .event', { timeout: 5000 });
          } catch (error) {
            console.log('Could not find calendar event elements, trying to proceed anyway');
          }
          
          // Extract calendar events
          const calendarEvents = await page.evaluate(() => {
            const events = [];
            
            // Look for calendar day cells
            const dayElements = Array.from(document.querySelectorAll('.tribe-events-calendar-month__day-cell, .calendar-day, .day'));
            
            dayElements.forEach(dayElement => {
              // Skip empty days
              const hasEvent = dayElement.classList.contains('tribe-events-has-events') || 
                              dayElement.querySelector('.event');
              
              if (!hasEvent) return;
              
              // Extract the date for this day
              const dateElement = dayElement.querySelector('.tribe-events-calendar-month__day-date, .date');
              const dateText = dateElement ? dateElement.textContent.trim() : '';
              
              // Extract events from this day
              const eventElements = Array.from(dayElement.querySelectorAll('.tribe-events-calendar-month__event, .event'));
              
              eventElements.forEach(eventElement => {
                const title = eventElement.querySelector('.tribe-events-calendar-month__event-title, .event-title')?.textContent.trim() || '';
                if (!title) return;
                
                const linkElement = eventElement.querySelector('a[href]');
                const sourceUrl = linkElement ? linkElement.href : '';
                
                if (title && dateText) {
                  events.push({ title, dateText, sourceUrl });
                }
              });
            });
            
            return events;
          });
          
          console.log(`Found ${calendarEvents.length} potential calendar events`);
          
          // Process calendar events - visit each event page to get details
          for (const eventData of calendarEvents) {
            const { title, sourceUrl } = eventData;
            
            if (sourceUrl) {
              try {
                console.log(`Visiting event page: ${sourceUrl}`);
                await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                
                // Extract full event details
                const eventDetails = await page.evaluate(() => {
                  const title = document.querySelector('h1, .tribe-events-single-event-title')?.textContent.trim() || '';
                  const description = document.querySelector('.tribe-events-content, .event-description, .content')?.textContent.trim() || '';
                  const dateText = document.querySelector('.tribe-events-schedule, .event-date, .date')?.textContent.trim() || '';
                  const imageElement = document.querySelector('.tribe-events-event-image img, .event-image img, .featured-image img');
                  const imageUrl = imageElement ? imageElement.src : '';
                  
                  return { title, description, dateText, imageUrl };
                });
                
                // Parse date from event details
                const dateInfo = this.parseDateRange(eventDetails.dateText);
                
                if (!dateInfo.startDate || !dateInfo.endDate) {
                  console.log(`Skipping event "${eventDetails.title}" due to invalid date: "${eventDetails.dateText}"`);
                  continue;
                }
                
                // Generate event ID
                const eventId = this.generateEventId(eventDetails.title || title, dateInfo.startDate);
                
                // Create event object
                const event = this.createEventObject(
                  eventId,
                  eventDetails.title || title,
                  eventDetails.description,
                  dateInfo.startDate,
                  dateInfo.endDate,
                  eventDetails.imageUrl,
                  sourceUrl
                );
                
                // Add event to events array
                events.push(event);
                
              } catch (error) {
                console.log(`Error accessing event page: ${error.message}`);
              }
            }
          }
        } catch (error) {
          console.log(`Error checking calendar page: ${error.message}`);
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

module.exports = MacMillanSpaceCentreEvents;
