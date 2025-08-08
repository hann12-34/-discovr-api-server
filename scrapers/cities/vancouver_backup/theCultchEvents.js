const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * The Cultch Events Scraper
 * Scrapes events from The Cultch in Vancouver
 * Enhanced with direct Ticketmaster integration for reliability
 */

const { launchStealthBrowser, setupStealthPage } = require('../../utils/puppeteer-stealth');
const slugify = require('slugify');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * The Cultch Events Scraper
 */
const TheCultchEvents = {
  name: 'The Cultch',
  url: 'https://thecultch.com/shows-events/',
  ticketmasterUrl: 'https://www.ticketmaster.ca/search?q=the+cultch',
  alternativeUrls: [
    'https://thecultch.com/whats-on/', 
    'https://thecultch.com/shows/', 
    'https://thecultch.com/events/',
    'https://tickets.thecultch.com/events',
    'https://tickets.thecultch.com/'
  ],
  enabled: true,
  
  /**
   * Helper method to get month index from month name
   * @param {string} monthName - Full or abbreviated month name
   * @returns {number} - Month index (0-11)
   */
  getMonthIndex(monthName) {
    const monthMap = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };
    
    return monthMap[monthName.toLowerCase()] || monthMap[monthName.toLowerCase().substring(0, 3)] || 0;
  },
  
  /**
   * Parse date strings into start and end date objects
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object with startDate and endDate
   */
  parseDates(dateString) {
    if (!dateString) {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setHours(today.getHours() + 3);
      return { startDate: today, endDate };
    }
    
    try {
      console.log(`Attempting to parse date: '${dateString}'`);
      
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // EventBrite format: "Thu, Jul 18, 8:00 PM"
      const eventbritePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{1,2}):(\d{2})\s+(AM|PM)(?:\s+\+\s+\d+\s+more)?/i;
      const eventbriteMatch = dateString.match(eventbritePattern);
      
      if (eventbriteMatch) {
        console.log(`Matched EventBrite pattern for: ${dateString}`);
        const month = eventbriteMatch[2];
        const day = parseInt(eventbriteMatch[3]);
        let hour = parseInt(eventbriteMatch[4]);
        const minute = parseInt(eventbriteMatch[5]);
        const ampm = eventbriteMatch[6].toUpperCase();
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        
        let year = new Date().getFullYear();
        // If the event is in the past, assume it's for next year
        const currentDate = new Date();
        const eventDate = new Date(year, this.getMonthIndex(month), day);
        if (eventDate < currentDate) {
          year = currentDate.getFullYear() + 1;
        }
        
        const startDate = new Date(year, this.getMonthIndex(month), day, hour, minute);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
      
      // SongKick format: "Tuesday 16 July 2024"
      const songkickPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
      const songkickMatch = dateString.match(songkickPattern);
      
      if (songkickMatch) {
        console.log(`Matched SongKick pattern for: ${dateString}`);
        const day = parseInt(songkickMatch[2]);
        const month = songkickMatch[3];
        const year = parseInt(songkickMatch[4]);
        
        const startDate = new Date(year, this.getMonthIndex(month), day, 19, 0); // Default to 7 PM
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
      
      // Month and day pattern: "July 18th"
      const monthDayPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const monthDayMatch = dateString.match(monthDayPattern);
      
      if (monthDayMatch) {
        console.log(`Matched Month/Day pattern for: ${dateString}`);
        const month = monthDayMatch[1];
        const day = parseInt(monthDayMatch[2]);
        
        let year = new Date().getFullYear();
        // If the event is in the past, assume it's for next year
        const currentDate = new Date();
        const eventDate = new Date(year, this.getMonthIndex(month), day);
        if (eventDate < currentDate) {
          year = currentDate.getFullYear() + 1;
        }
        
        const startDate = new Date(year, this.getMonthIndex(month), day, 19, 0); // Default to 7 PM
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
      
      // Try to extract date components
      const datePattern = /([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i;
      const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
      
      const dateMatch = dateString.match(datePattern);
      const timeMatch = dateString.match(timePattern);
      
      if (dateMatch) {
        const month = dateMatch[1];
        const day = parseInt(dateMatch[2]);
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
        
        // If the event is in the past, assume it's for next year
        if (new Date().getMonth() > 6 && ["jan", "feb", "mar", "apr", "may", "jun"].includes(month.toLowerCase().substring(0, 3))) {
          year = new Date().getFullYear() + 1;
        }
        
        const months = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
          january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, 
          august: 7, september: 8, october: 9, november: 10, december: 11
        };
        
        const monthIndex = months[month.toLowerCase().substring(0, 3)];
        
        if (monthIndex !== undefined) {
          let hour = 19; // Default to 7 PM for events
          let minute = 0;
          
          if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            if (timeMatch[3].toLowerCase() === 'pm' && hour < 12) {
              hour += 12;
            }
          }
          
          const startDate = new Date(year, monthIndex, day, hour, minute);
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Fallback to generic date parsing
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const endDate = new Date(parsedDate);
        endDate.setHours(endDate.getHours() + 3);
        return { startDate: parsedDate, endDate };
      }
      
      // Default fallback
      const today = new Date();
      const endDate = new Date(today);
      endDate.setHours(today.getHours() + 3);
      return { startDate: today, endDate };
    } catch (error) {
      console.error(`Error parsing date: ${error.message}`);
      const today = new Date();
      const endDate = new Date(today);
      endDate.setHours(today.getHours() + 3);
      return { startDate: today, endDate };
    }
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, price) {
    return {
      id: id || `the-cultch-${slugify(title, {lower: true})}-${startDate.toISOString().split('T')[0]}`,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      ticketUrl: sourceUrl || this.url,
      venue: {
        name: 'The Cultch',
        address: '1895 Venables Street',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5L 2H6',
        website: 'https://thecultch.com',
        googleMapsUrl: 'https://goo.gl/maps/zSZRnc9y7TtxHG5f7'
      },
      categories: [
        'theater',
        'performance',
        'arts',
        'culture',
        'entertainment'
      ],
      price: price || '',
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'the-cultch'
    };
  },
  
  /**
   * Scrape events directly from Ticketmaster
   * @returns {Promise<Array>} - Array of events from Ticketmaster
   */
  async scrapeTicketmaster() {
    try {
      console.log(`Scraping Ticketmaster for ${this.name} events...`);
      
      // Try multiple potential Ticketmaster URLs
      const ticketmasterUrls = [
        'https://www.ticketmaster.ca/search?q=the+cultch',
        'https://www.ticketmaster.ca/search?q=cultch+vancouver',
        'https://www.ticketweb.ca/venue/the-cultch-vancouver-bc/28758',
        'https://www.eventbrite.ca/d/canada--vancouver/cultch/',
        'https://www.songkick.com/venues/2517933-cultch',
        'https://www.todaytix.com/vancouver/venues/2717-the-cultch'
      ];
      
      let allEvents = [];
      
      for (const tmUrl of ticketmasterUrls) {
        try {
          console.log(`Trying Ticketmaster URL: ${tmUrl}`);
          const response = await axios.get(tmUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            }
          });
          
          const $ = cheerio.load(response.data);
          
          // Extract event cards from Ticketmaster page with multiple selector patterns
          const eventCardSelectors = [
            'div[data-track="event card"]', 
            '.event-card', 
            '.event-listing', 
            '.event-item', 
            '.tm-grid-item',
            '.event-tile',
            '.listings-item',
            '.event-row',
            '.eds-event-card-content',
            '.eds-l-pad-all',
            '.search-event-card',
            'li.js-event-list-item'
          ];
          
          let foundEvents = false;
          
          // Try each selector pattern
          for (const selector of eventCardSelectors) {
            console.log(`Trying selector pattern: ${selector}`);
            
            $(selector).each((i, element) => {
              try {
                const title = $(element).find('h3').text().trim() || 
                              $(element).find('.event-name').text().trim() || 
                              $(element).find('.title').text().trim() || 
                              $(element).find('.eds-event-card-content__title').text().trim();
                              
                if (!title) return;
                
                const url = $(element).find('a').attr('href');
                const fullUrl = url ? (url.startsWith('http') ? url : `https://www.ticketmaster.ca${url}`) : '';
                
                // Get image
                let image = '';
                const imgEl = $(element).find('img');
                if (imgEl.length) {
                  image = imgEl.attr('src') || '';
                }
                
                // Get date with multiple selector patterns
                let dateText = '';
                
                // Define date selectors
                const dateSelectors = [
                  'time',
                  '.date',
                  '.time',
                  '.datetime',
                  '.event-date',
                  '.event-time',
                  '.date-info',
                  '.info-date',
                  '.event-date-range',
                  '.date-badge',
                  '.date-block',
                  'p.event-card-date-location',
                  'p:contains("Tue,")',
                  'p:contains("Wed,")',
                  'p:contains("Thu,")',
                  'p:contains("Fri,")',
                  'p:contains("Sat,")',
                  'p:contains("Sun,")',
                  'p:contains("Mon,")',
                  'span:contains("PM")',
                  'span:contains("AM")',
                  'div:contains("PM")',
                  'div:contains("AM")'
                ];
                
                // Try each date selector in order
                for (const dateSelector of dateSelectors) {
                  dateText = $(element).find(dateSelector).text().trim();
                  if (dateText) {
                    console.log(`Found date text with selector ${dateSelector}: ${dateText}`);
                    break;
                  }
                }
                
                // Fallback to hard-coded selectors if needed
                if (!dateText) {
                  dateText = $(element).find('time').text().trim() || 
                           $(element).find('.date').text().trim() || 
                           $(element).find('.event-date').text().trim() || 
                           $(element).find('.eds-event-card-content__sub-title').text().trim() ||
                           $(element).find('.date-info').text().trim() ||
                           $(element).find('.date-wrapper').text().trim() ||
                           $(element).find('.card-text-date').text().trim();
                }
                
                if (!dateText) {
                  console.log(`No date found for event: ${title}`);
                  return;
                }
                
                // Try to parse the date
                let startDate, endDate;
                try {
                  const parsedDates = this.parseDates(dateText);
                  startDate = parsedDates.startDate;
                  endDate = parsedDates.endDate;
                } catch (dateError) {
                  console.error(`Error parsing date: ${dateError.message}`);
                  return;
                }
                
                if (!startDate) {
                  console.log(`Could not parse date for event: ${title}`);
                  return;
                }
                
                // Generate ID
                const id = `${this.name.toLowerCase()}-${slugify(title, {lower: true})}-${startDate.toISOString().split('T')[0]}`;
                
                // Create event object
                const event = this.createEventObject(id, title, '', startDate, endDate, image, fullUrl);
                allEvents.push(event);
                foundEvents = true;
                console.log(`Found event: ${title} on ${startDate.toISOString().split('T')[0]}`);
              } catch (error) {
                console.error(`Error extracting event: ${error.message}`);
              }
            });
            
            // If we found events with this selector, no need to try other selectors
            if (foundEvents) {
              console.log(`Found events using selector: ${selector}`);
              break;
            }
          }
          
          // If we found events on this URL, no need to try other URLs
          if (allEvents.length > 0) {
            console.log(`Found ${allEvents.length} events at ${tmUrl}`);
            break;
          }
        } catch (urlError) {
          console.error(`Error fetching from ${tmUrl}: ${urlError.message}`);
        }
      }
      
      return allEvents;
    } catch (error) {
      console.error(`Error scraping Ticketmaster: ${error.message}`);
      return [];
    }
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
    let events = [];
    let browser;
    
    try {
      // First try Ticketmaster
      const ticketmasterEvents = await this.scrapeTicketmaster();
      
      if (ticketmasterEvents && ticketmasterEvents.length > 0) {
        console.log(`Found ${ticketmasterEvents.length} events from Ticketmaster`);
        return ticketmasterEvents;
      }
      
      console.log('No events found on Ticketmaster, trying original website...');
      
      browser = await launchStealthBrowser();
      
      const page = await browser.newPage();
      
      // Apply stealth settings to the page
      await setupStealthPage(page);
      
      // Set navigation timeout
      await page.setDefaultNavigationTimeout(45000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/cultch_debug.png' });
      console.log('Saved debug screenshot to /tmp/cultch_debug.png');
      
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 5000 });
      
      // Try to extract events using multiple approaches
      events = await page.evaluate(() => {
        const extractedEvents = [];
        
        // Find all potential event containers
        const containers = [
          ...document.querySelectorAll('.event, .events, .event-item, [class*="event"], article, .card'),
          ...document.querySelectorAll('.show, .shows, .show-item, [class*="show"]'),
          ...document.querySelectorAll('h2 a, h3 a')
        ];
        
        // Process each container
        containers.forEach(container => {
          try {
            // Extract event title
            let title = '';
            const titleElement = container.querySelector('h2, h3, h4, .title') || container;
            title = titleElement.textContent.trim();
            
            if (!title) return;
            
            // Extract URL
            let url = '';
            const linkElement = container.tagName === 'A' ? container : container.querySelector('a');
            if (linkElement) url = linkElement.href;
            
            // Extract date
            let dateText = '';
            const dateElements = container.querySelectorAll('.date, [class*="date"], time');
            dateElements.forEach(el => {
              if (el.textContent.trim()) dateText += ' ' + el.textContent.trim();
            });
            
            // Extract image
            let imageUrl = '';
            const imgElement = container.querySelector('img');
            if (imgElement) imageUrl = imgElement.src;
            
            // Extract description
            let description = '';
            const descriptionElement = container.querySelector('p, .description, [class*="desc"]');
            if (descriptionElement) description = descriptionElement.textContent.trim();
            
            // Add event if we have at least a title
            if (title) {
              extractedEvents.push({
                title,
                url,
                dateText,
                imageUrl,
                description
              });
            }
          } catch (error) {
            console.error('Error extracting event:', error);
          }
        });
        
        return extractedEvents;
      });
      
      console.log(`Found ${events.length} potential events on website`);
      
      // Process each extracted event
      const processedEvents = [];
      for (const event of events) {
        // Skip error pages
        if (event.title.toLowerCase().includes('not found') || 
            event.title.toLowerCase().includes('error') ||
            event.title.toLowerCase().includes('sorry') ||
            event.description.toLowerCase().includes('not available')) {
          console.log(`Skipping error page: ${event.title}`);
          continue;
        }
        
        // Parse dates
        const { startDate, endDate } = this.parseDates(event.dateText);
        
        // Generate ID
        const id = `the-cultch-${slugify(event.title, {lower: true})}-${startDate.toISOString().split('T')[0]}`;
        
        // Create event object
        const processedEvent = this.createEventObject(
          id,
          event.title,
          event.description,
          startDate,
          endDate,
          event.imageUrl,
          event.url
        );
        
        processedEvents.push(processedEvent);
      }
      
      return processedEvents;
    } catch (error) {
      console.error(`Error scraping ${this.name}: ${error.message}`);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};

// Export the scraper
// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new TheCultchEvents();
