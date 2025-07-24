/**
 * Vancouver International Film Festival Events Scraper
 * Scrapes events from the Vancouver International Film Festival (VIFF)
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * Vancouver International Film Festival Events Scraper
 */
const VancouverFilmFestivalEvents = {
  name: 'Vancouver International Film Festival',
  url: 'https://viff.org/whats-on/',
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
      
      // Check for ISO date format (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const parts = dateString.split(' - ');
        const startDate = new Date(parts[0]);
        const endDate = parts.length > 1 ? new Date(parts[1]) : new Date(startDate);
        
        // Set end date to end of day if it's the same as start date
        if (parts.length === 1) {
          endDate.setHours(23, 59, 59);
        }
        
        return { startDate, endDate };
      }
      
      // Match patterns like "September 26 - October 6, 2025"
      const fullDateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[–—-]\s*)([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i;
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
          const startDate = new Date(year, startMonthNum, startDay);
          const endDate = new Date(year, endMonthNum, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match patterns like "January 15 - 20, 2025" 
      const sameMonthPattern = /([A-Za-z]+)\s+(\d{1,2})(?:\s*[–—-]\s*)(\d{1,2}),?\s*(\d{4})/i;
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
          const startDate = new Date(year, monthNum, startDay);
          const endDate = new Date(year, monthNum, endDay, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match patterns like "January 15, 2025"
      const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/i;
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
          const startDate = new Date(year, monthNum, day);
          const endDate = new Date(year, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try to handle more date formats with Date.parse
      const dateParts = dateString.split(/\s*[–—-]\s*/);
      if (dateParts.length > 0) {
        // Try to parse the first part as a date
        const startDate = new Date(dateParts[0]);
        
        if (!isNaN(startDate.getTime())) {
          let endDate;
          
          if (dateParts.length > 1) {
            // If there's a range, parse the end date
            endDate = new Date(dateParts[1]);
            
            // If only the day was specified in the end date, copy year/month from start date
            if (/^\d{1,2}(st|nd|rd|th)?$/i.test(dateParts[1].trim())) {
              const day = parseInt(dateParts[1]);
              endDate = new Date(startDate);
              endDate.setDate(day);
            }
          } else {
            // If no range, end date is same as start but at end of day
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59);
          }
          
          if (!isNaN(endDate.getTime())) {
            return { startDate, endDate };
          }
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
    
    return `viff-${slug}-${dateStr}`;
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
        name: 'Vancouver International Film Festival',
        address: '1181 Seymour Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6B 3M7',
        website: 'https://viff.org/',
        googleMapsUrl: 'https://goo.gl/maps/J4oBH5YaGu8G6ncA7'
      },
      categories: [
        'film',
        'festival',
        'arts',
        'cinema',
        'entertainment'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'viff'
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
        await page.waitForSelector('.film-card, .event-card, .film-item, article', { timeout: 10000 });
      } catch (error) {
        console.log('Could not find event elements using standard selectors, trying to proceed anyway');
      }
      
      // Extract events data
      console.log('Extracting film and event data...');
      const filmsData = await page.evaluate(() => {
        const films = [];
        
        // Look for film elements with various possible selectors
        const filmElements = Array.from(document.querySelectorAll('.film-card, .event-card, .film-item, article, .event'));
        
        filmElements.forEach(element => {
          // Extract title
          const titleElement = element.querySelector('h2, h3, h4, .title, .film-title, .event-title');
          const title = titleElement ? titleElement.textContent.trim() : '';
          
          if (!title) return; // Skip films without titles
          
          // Extract description
          const descriptionElement = element.querySelector('p, .description, .synopsis, .excerpt');
          const description = descriptionElement ? descriptionElement.textContent.trim() : '';
          
          // Extract date
          const dateElement = element.querySelector('.date, .event-date, .screening-date, time');
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
          
          // Only add films with a title
          if (title) {
            films.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl
            });
          }
        });
        
        return films;
      });
      
      console.log(`Found ${filmsData.length} potential films/events`);
      
      // Process each film/event
      for (const filmData of filmsData) {
        const { title, description, dateText, imageUrl, sourceUrl } = filmData;
        
        // If we have a source URL, visit the detail page to get more information
        if (sourceUrl) {
          console.log(`Visiting film detail page: ${sourceUrl}`);
          
          try {
            await page.goto(sourceUrl, { 
              waitUntil: 'networkidle2', 
              timeout: 15000 
            });
            
            // Extract detailed film information
            const detailData = await page.evaluate(() => {
              // Extract date(s) from the page
              const dateElements = Array.from(document.querySelectorAll('.screening-date, .date, .event-date, .showtime'));
              const dateTexts = dateElements.map(el => el.textContent.trim()).filter(text => text);
              
              // Extract description/synopsis
              const descriptionElement = document.querySelector('.synopsis, .description, .event-description, .content');
              const description = descriptionElement ? descriptionElement.textContent.trim() : '';
              
              // Extract better image if available
              const imageElement = document.querySelector('.film-poster img, .event-image img, .featured-image img');
              const imageUrl = imageElement && imageElement.src ? imageElement.src : '';
              
              // Extract details like director, country, year
              const detailElements = Array.from(document.querySelectorAll('.film-details, .meta, .details'));
              let details = '';
              detailElements.forEach(el => {
                details += el.textContent.trim() + ' ';
              });
              
              return {
                dateTexts,
                description,
                imageUrl,
                details
              };
            });
            
            // Try to find valid dates from the detail page
            let foundValidDate = false;
            if (detailData.dateTexts && detailData.dateTexts.length > 0) {
              // Try each date text found on the page
              for (const dateText of detailData.dateTexts) {
                const dateInfo = this.parseDateRange(dateText);
                
                if (dateInfo.startDate && dateInfo.endDate) {
                  console.log(`Found valid date: ${dateText}`);
                  
                  // Generate event ID
                  const eventId = this.generateEventId(title, dateInfo.startDate);
                  
                  // Create event object
                  const event = this.createEventObject(
                    eventId,
                    title,
                    (detailData.description || description) + (detailData.details ? `\n\nDetails: ${detailData.details}` : ''),
                    dateInfo.startDate,
                    dateInfo.endDate,
                    detailData.imageUrl || imageUrl,
                    sourceUrl
                  );
                  
                  // Add event to events array
                  events.push(event);
                  foundValidDate = true;
                  break; // Found a valid date, no need to check others
                }
              }
            }
            
            // If no valid dates found from date elements, check if the film is part of the festival itself
            if (!foundValidDate) {
              console.log(`No specific screening dates found for "${title}". Checking for festival dates.`);
              
              // Look for festival dates on the page or in the content
              const festivalDateMatch = await page.evaluate(() => {
                const content = document.body.textContent;
                
                // Look for common festival date patterns
                const patterns = [
                  /festival runs? (?:from )?([\w\s,]+)(?:\s*[-–—]\s*([\w\s,]+))?/i,
                  /(\w+ \d{1,2}(?:st|nd|rd|th)? ?[-–—] ?\w+ \d{1,2}(?:st|nd|rd|th)?,? \d{4})/i,
                  /(\w+ \d{1,2}(?:st|nd|rd|th)? ?[-–—] ?\d{1,2}(?:st|nd|rd|th)?,? \d{4})/i,
                  /(viff \d{4}:? \w+ \d{1,2}(?:st|nd|rd|th)? ?[-–—] ?\w+ \d{1,2}(?:st|nd|rd|th)?)/i,
                  /dates: ([\w\s,]+)(?:\s*[-–—]\s*([\w\s,]+))?/i
                ];
                
                for (const pattern of patterns) {
                  const match = content.match(pattern);
                  if (match) {
                    return match[0];
                  }
                }
                
                return null;
              });
              
              if (festivalDateMatch) {
                console.log(`Found festival date reference: ${festivalDateMatch}`);
                
                // Try to parse the festival date
                const dateInfo = this.parseDateRange(festivalDateMatch);
                
                if (dateInfo.startDate && dateInfo.endDate) {
                  // Generate event ID
                  const eventId = this.generateEventId(title, dateInfo.startDate);
                  
                  // Create event object
                  const event = this.createEventObject(
                    eventId,
                    title,
                    (detailData.description || description) + (detailData.details ? `\n\nDetails: ${detailData.details}` : ''),
                    dateInfo.startDate,
                    dateInfo.endDate,
                    detailData.imageUrl || imageUrl,
                    sourceUrl
                  );
                  
                  // Add event to events array
                  events.push(event);
                  foundValidDate = true;
                }
              }
            }
            
            // If still no valid dates, try to find this year's festival dates from the homepage
            if (!foundValidDate) {
              console.log('No specific dates found. Looking for festival dates on the homepage.');
              
              try {
                await page.goto('https://viff.org/', { waitUntil: 'networkidle2', timeout: 15000 });
                
                const festivalDates = await page.evaluate(() => {
                  // Look for the main festival dates on the homepage
                  const content = document.body.textContent;
                  
                  // Common patterns for festival dates on homepage
                  const patterns = [
                    /(\d{4}) festival:? (\w+ \d{1,2}(?:st|nd|rd|th)?)(?:\s*[-–—]\s*(\w+ \d{1,2}(?:st|nd|rd|th)?))?/i,
                    /viff \d{4}:? (\w+ \d{1,2}(?:st|nd|rd|th)?)(?:\s*[-–—]\s*(\w+ \d{1,2}(?:st|nd|rd|th)?))?/i,
                    /\d{4} festival dates:? (\w+ \d{1,2}(?:st|nd|rd|th)?)(?:\s*[-–—]\s*(\w+ \d{1,2}(?:st|nd|rd|th)?))?/i
                  ];
                  
                  for (const pattern of patterns) {
                    const match = content.match(pattern);
                    if (match) {
                      return match[0];
                    }
                  }
                  
                  // Check for any dates mentioned with the current year
                  const currentYear = new Date().getFullYear();
                  const yearPattern = new RegExp(`${currentYear}[^\\d]+(\\w+ \\d{1,2}(?:st|nd|rd|th)?)(?:\\s*[-–—]\\s*(\\w+ \\d{1,2}(?:st|nd|rd|th)?))?`, 'i');
                  const yearMatch = content.match(yearPattern);
                  
                  if (yearMatch) {
                    return yearMatch[0];
                  }
                  
                  return null;
                });
                
                if (festivalDates) {
                  console.log(`Found festival dates on homepage: ${festivalDates}`);
                  
                  // Try to parse the festival dates
                  const dateInfo = this.parseDateRange(festivalDates);
                  
                  if (dateInfo.startDate && dateInfo.endDate) {
                    // Generate event ID
                    const eventId = this.generateEventId(title, dateInfo.startDate);
                    
                    // Create event object
                    const event = this.createEventObject(
                      eventId,
                      title,
                      (detailData.description || description) + (detailData.details ? `\n\nDetails: ${detailData.details}` : ''),
                      dateInfo.startDate,
                      dateInfo.endDate,
                      detailData.imageUrl || imageUrl,
                      sourceUrl
                    );
                    
                    // Add event to events array
                    events.push(event);
                    foundValidDate = true;
                  }
                }
              } catch (error) {
                console.log(`Error checking homepage for festival dates: ${error.message}`);
              }
            }
            
            // If we still don't have dates, skip this event
            if (!foundValidDate) {
              console.log(`Skipping film "${title}" due to missing valid dates`);
            }
            
          } catch (error) {
            console.log(`Error accessing film detail page: ${error.message}`);
          }
        }
        // If no source URL but we have date text, try to parse it
        else if (dateText) {
          const dateInfo = this.parseDateRange(dateText);
          
          if (dateInfo.startDate && dateInfo.endDate) {
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
              this.url
            );
            
            // Add event to events array
            events.push(event);
          } else {
            console.log(`Skipping film "${title}" due to invalid date: "${dateText}"`);
          }
        } else {
          console.log(`Skipping film "${title}" due to missing date and source URL`);
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
module.exports = new VancouverFilmFestivalEvents();
