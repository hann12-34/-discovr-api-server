/**
 * Rickshaw Theatre Events Scraper
 * Scrapes events from the Rickshaw Theatre in Vancouver
 */

const { launchStealthBrowser, setupStealthPage } = require('../../utils/puppeteer-stealth');
const slugify = require('slugify');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Rickshaw Theatre Events Scraper
 */
const RickshawTheatreEvents = {
  name: 'Rickshaw Theatre',
  url: 'https://www.rickshawtheatre.com/events',
  ticketmasterUrl: 'https://www.ticketmaster.ca/search?q=rickshaw+theatre',
  alternativeUrls: [
    'https://www.rickshawtheatre.com/',
    'https://www.rickshawtheatre.com/schedule',
    'https://www.rickshawtheatre.com/calendar',
    'https://admitone.com/venues/rickshaw-theatre',
    'https://www.eventbrite.ca/o/rickshaw-theatre-30290761206',
    'https://www.ticketmaster.ca/rickshaw-theatre-tickets-vancouver/venue/139312',
    'https://www.showpass.com/o/rickshaw-theatre/'
  ],
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
      
      // Handle EventBrite format: "Tue, Sep 30, 7:00 PM" or "Thu, Jul 18, 2024, 8:00 PM"
      const eventbritePattern = /(?:(?:mon|tue|wed|thu|fri|sat|sun)),\s+([a-z]{3})\s+(\d{1,2})(?:,\s+(\d{4}))?(?:,)?\s+(\d{1,2}):(\d{2})\s+(am|pm)/i;
      const eventbriteMatch = dateString.match(eventbritePattern);
      
      if (eventbriteMatch) {
        console.log(`Matched EventBrite pattern for: ${dateString}`);
        const month = eventbriteMatch[1];
        const day = parseInt(eventbriteMatch[2]);
        // Use provided year or current year
        const year = eventbriteMatch[3] ? parseInt(eventbriteMatch[3]) : new Date().getFullYear();
        let hours = parseInt(eventbriteMatch[4]);
        const minutes = parseInt(eventbriteMatch[5]);
        const meridiem = eventbriteMatch[6].toLowerCase();
        
        // Convert to 24-hour format
        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;
        
        const months = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, day, hours, minutes);
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          return { startDate, endDate };
        }
      }
      
      // Handle format: "Friday July 26 2024" or "Fri Jul 26" or similar variations
      const dayMonthPattern = /(?:(?:mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:,\s*)?(\d{4})?/i;
      const dayMonthMatch = dateString.match(dayMonthPattern);
      
      if (dayMonthMatch) {
        const month = dayMonthMatch[1];
        const day = parseInt(dayMonthMatch[2]);
        // If year is not specified, use current year
        const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3]) : new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // Look for time information
          const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/;
          const timeMatch = dateString.match(timePattern);
          
          let hours = 20; // Default to 8:00 PM for concerts if no time provided
          let minutes = 0;
          
          if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
          
          const startDate = new Date(year, monthNum, day, hours, minutes);
          
          // For events, typically set endDate to 3 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Handle format with more explicit time: "July 26, 2024 8:00PM"
      const dateTimePattern = /([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}),?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i;
      const dateTimeMatch = dateString.match(dateTimePattern);
      
      if (dateTimeMatch) {
        const month = dateTimeMatch[1];
        const day = parseInt(dateTimeMatch[2]);
        const year = parseInt(dateTimeMatch[3]);
        const hours = parseInt(dateTimeMatch[4]);
        const minutes = dateTimeMatch[5] ? parseInt(dateTimeMatch[5]) : 0;
        const meridiem = dateTimeMatch[6].toLowerCase();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          let hours24 = hours;
          if (meridiem === 'pm' && hours < 12) hours24 += 12;
          if (meridiem === 'am' && hours === 12) hours24 = 0;
          
          const startDate = new Date(year, monthNum, day, hours24, minutes);
          
          // For events, typically set endDate to 3 hours after startDate
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          
          return { startDate, endDate };
        }
      }
      
      // Handle SongKick format: "Tuesday 16 July 2024"
      const songkickPattern = /([a-z]+)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/i;
      const songkickMatch = dateString.match(songkickPattern);
      
      if (songkickMatch) {
        console.log(`Matched SongKick pattern for: ${dateString}`);
        const day = parseInt(songkickMatch[2]);
        const month = songkickMatch[3];
        const year = parseInt(songkickMatch[4]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        if (monthNum !== undefined) {
          // Default to 8:00 PM for concerts if no time specified
          const startDate = new Date(year, monthNum, day, 20, 0);
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 3);
          return { startDate, endDate };
        }
      }
      
      // Try standard date parsing as a fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        console.log(`Matched standard date format for: ${dateString}`);
        // Default to 8:00 PM for concerts if time not included in standard date
        const hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/);
        
        const startDate = new Date(parsedDate);
        if (!hasTimeInfo) {
          startDate.setHours(20, 0, 0);
        }
        
        // For events, typically set endDate to 3 hours after startDate
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
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
    
    return `rickshaw-theatre-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, price) {
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
        name: 'Rickshaw Theatre',
        address: '254 East Hastings Street',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6A 1P1',
        website: 'https://www.rickshawtheatre.com',
        googleMapsUrl: 'https://goo.gl/maps/nhkohQjrW8uBw2cF8'
      },
      categories: [
        'music',
        'concert',
        'live-music',
        'nightlife',
        'entertainment'
      ],
      price: price || '',
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'rickshaw-theatre'
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
        'https://www.ticketmaster.ca/search?q=rickshaw+theatre',
        'https://www.ticketmaster.ca/search?q=rickshaw+vancouver',
        'https://www.ticketmaster.ca/search?q=rickshaw+hastings+vancouver',
        'https://www.ticketweb.ca/search?q=rickshaw+theatre',
        'https://www.eventbrite.ca/d/canada--vancouver/rickshaw/',
        'https://www.songkick.com/venues/1465823-rickshaw-theatre',
        'https://www.songkick.com/search?page=1&query=rickshaw+vancouver',
        'https://www.songkick.com/search?page=1&query=rickshaw+theatre+vancouver',
        'https://www.songkick.com/search?page=1&query=rickshaw+hastings+vancouver',
        'https://www.ticketmaster.ca/venue/rickshaw-theatre-vancouver-bc/1465823',
        'https://www.ticketweb.ca/venue/rickshaw-theatre-vancouver-bc/1465823',
        'https://www.eventbrite.ca/o/rickshaw-theatre-1465823'
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
          
          // Extract event cards from the page with multiple selector patterns
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
            'li.js-event-list-item',
            'li.event',
            '.songkick-event'
          ];
          
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
          
          let foundEvents = false;
          
          // Try each selector pattern
          for (const selector of eventCardSelectors) {
            console.log(`Trying selector pattern: ${selector}`);
            
            $(selector).each((i, element) => {
              try {
                const title = $(element).find('h3').text().trim() || 
                              $(element).find('.event-name').text().trim() || 
                              $(element).find('.title').text().trim() ||
                              $(element).find('.card-text-headline').text().trim();
                              
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
                            $(element).find('.datetime').text().trim() || 
                            $(element).find('.info-date').text().trim() ||
                            $(element).find('.eds-event-card-content__sub-title').text().trim() ||
                            $(element).find('.card-text-date').text().trim() ||
                            $(element).find('p.event-card-date-location').text().trim();
                  }
                                 
                if (!dateText) {
                  console.log(`No date found for event: ${title}`);
                  return;
                }
                
                // Try to parse the date
                let startDate, endDate;
                try {
                  const parsedDates = this.parseDateRange(dateText);
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
                const id = this.generateEventId(title, startDate);
                
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
      
      // The stealth plugin now handles all navigator property overrides
      
      page.setDefaultNavigationTimeout(30000);
      
      console.log(`Navigating to ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/rickshaw_initial.png' });
      console.log('Saved initial screenshot to /tmp/rickshaw_initial.png');
      
      // Try to find event elements
      try {
        // Wait longer and use more comprehensive selectors
        await page.waitForSelector('.event, .eventlist-event, article, .event-card, .eventlist-column, .upcoming-events, .event-listing, .event-list, .events-container', { timeout: 20000 });
        console.log('Found event elements on main URL');
      } catch (error) {
        console.log('Could not find event elements with standard selectors on main URL, trying alternative URLs...');
        
        // Try alternative URLs if main URL doesn't have events
        let foundEvents = false;
        for (const altUrl of this.alternativeUrls) {
          try {
            console.log(`Trying alternative URL: ${altUrl}`);
            await page.goto(altUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.screenshot({ path: `/tmp/rickshaw_alt_url.png` });
            
            // Check for events on this URL
            const hasEvents = await page.evaluate(() => {
              const selectors = [
                '.event', '.eventlist-event', 'article', '.event-card', '.eventlist-column', 
                '.upcoming-events', '.event-listing', '.event-list', '.events-container', 
                '[class*="event"]'
              ];
              
              for (const selector of selectors) {
                if (document.querySelectorAll(selector).length > 0) {
                  return true;
                }
              }
              return false;
            });
            
            if (hasEvents) {
              console.log(`Found events at alternative URL: ${altUrl}`);
              foundEvents = true;
              break;
            }
          } catch (navError) {
            console.log(`Error navigating to ${altUrl}: ${navError.message}`);
          }
        }
        
        if (!foundEvents) {
          console.log('Could not find events on any URL, will try to extract whatever is available');
        }
      }
      
      // Wait a bit longer for any dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/rickshaw_debug.png' });
      console.log('Saved debug screenshot to /tmp/rickshaw_debug.png');
      
      // Extract events data using multiple approaches
      const eventsData = await page.evaluate(() => {
        const events = [];
        const processedUrls = new Set(); // Track processed URLs to avoid duplicates
        
        // Approach 1: Structured event containers
        // Try much more comprehensive selectors for events
        const eventSelectors = [
          // Main event container selectors
          '.event', '.eventlist-event', 'article', '.event-card', '.eventlist-column',
          '.list-view-item', '.event-listing', '.event-item',
          // Class-based selectors
          'div[class*="event"]', 'li[class*="event"]', 'div[class*="show"]', '.eventitem', '.shows-list-item',
          // Specific event containers
          '.upcoming-event', '.shows-listing li', '.event-block', '.show-item', '.calendar-event',
          // Generic containers that might contain events
          '.content-section article', '.page-content .item', 'main .card'
        ];
        
        // Combine all event elements
        let eventElements = [];
        eventSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            eventElements = [...eventElements, ...Array.from(elements)];
          }
        });
        
        // Process structured event containers
        console.log(`Processing ${eventElements.length} potential event containers`);
        eventElements.forEach(element => {
          try {
            // Extract title using multiple selector approaches
            let title = '';
            const titleSelectors = [
              'h1', 'h2', 'h3', 'h4', '.eventlist-title', '.title', '.event-title', '.eventitem-title',
              '.card-title', '.event-name', '[class*="title"]', '[class*="header"]'
            ];
            
            for (const selector of titleSelectors) {
              const titleElement = element.querySelector(selector);
              if (titleElement && titleElement.textContent.trim()) {
                title = titleElement.textContent.trim();
                // Clean up title - remove 'Tickets', 'Buy', etc.
                title = title.replace(/(\s*tickets\s*|\s*buy\s*|\s*\|.*)/gi, '').trim();
                break;
              }
            }
            
            // If no title found yet, try the main link text
            if (!title) {
              const linkElem = element.querySelector('a[href*="event"], a.title, a[class*="title"], a');
              if (linkElem && linkElem.textContent.trim()) {
                title = linkElem.textContent.trim();
                title = title.replace(/(\s*tickets\s*|\s*buy\s*|\s*\|.*)/gi, '').trim();
              }
            }
            
            // Skip if no title found
            if (!title) return;
            
            // Extract description using multiple selectors
            let description = '';
            const descSelectors = [
              'p', '.eventlist-description', '.description', '.excerpt', '.summary', 
              '.details', '.content', '.event-description', '[class*="description"]'
            ];
            
            for (const selector of descSelectors) {
              const descElement = element.querySelector(selector);
              if (descElement && descElement.textContent.trim()) {
                description = descElement.textContent.trim();
                break;
              }
            }
            
            // Extract date using multiple selectors
            let dateText = '';
            const dateSelectors = [
              '.eventlist-meta-date', '.date', 'time', '.event-date', '.datetime', 
              '.calendar-date', '.when', '[class*="date"]', '[class*="time"]'
            ];
            
            for (const selector of dateSelectors) {
              const dateElement = element.querySelector(selector);
              if (dateElement && dateElement.textContent.trim()) {
                dateText = dateElement.textContent.trim();
                break;
              }
            }
            
            // Extract image URL
            let imageUrl = '';
            const imgElement = element.querySelector('img');
            if (imgElement && imgElement.src) {
              imageUrl = imgElement.src;
            }
            
            // Extract source URL
            let sourceUrl = '';
            const linkSelectors = [
              'a[href*="event"]', 'a[href*="show"]', 'a.more', 'a.details', 
              'a.button', 'a.btn', 'a.link', 'a'
            ];
            
            for (const selector of linkSelectors) {
              const linkElement = element.querySelector(selector);
              if (linkElement && linkElement.href) {
                sourceUrl = linkElement.href;
                break;
              }
            }
            
            // Skip if this URL has already been processed
            if (sourceUrl && processedUrls.has(sourceUrl)) return;
            if (sourceUrl) processedUrls.add(sourceUrl);
            
            // Extract price
            let price = '';
            const priceSelectors = ['.eventlist-meta-price', '.price', '.ticket-price', '.cost', '[class*="price"]'];
            
            for (const selector of priceSelectors) {
              const priceElement = element.querySelector(selector);
              if (priceElement && priceElement.textContent.trim()) {
                const priceText = priceElement.textContent.trim();
                const priceMatch = priceText.match(/\$\d+(\.\d{2})?/);
                if (priceMatch) {
                  price = priceMatch[0];
                  break;
                } else {
                  price = priceText;
                }
              }
            }
            
            events.push({
              title,
              description,
              dateText,
              imageUrl,
              sourceUrl,
              price
            });
          } catch (err) {
            console.log('Error processing event element:', err);
          }
        });
        
        // Approach 2: If few events found, try extracting from links
        if (events.length < 3) {
          console.log('Few events found with container approach, trying links approach');
          
          const eventLinks = Array.from(document.querySelectorAll(
            'a[href*="event"], a[href*="show"], a[href*="tickets"]'
          ));
          
          eventLinks.forEach(link => {
            try {
              const href = link.href;
              
              // Skip if already processed
              if (processedUrls.has(href)) return;
              processedUrls.add(href);
              
              // Get title from link text
              const title = link.textContent.trim();
              if (!title || title.toLowerCase().includes('more') || title.toLowerCase().includes('view all')) return;
              
              // Find parent container
              const container = link.closest('div') || link.closest('li') || link.closest('article') || link.parentElement;
              
              // Extract other details from container if possible
              let description = '';
              let dateText = '';
              let imageUrl = '';
              
              if (container) {
                const paragraphs = container.querySelectorAll('p');
                if (paragraphs.length > 0) {
                  description = paragraphs[0].textContent.trim();
                }
                
                const dateElement = container.querySelector('.date, time, [class*="date"]');
                if (dateElement) {
                  dateText = dateElement.textContent.trim();
                }
                
                const imgElement = container.querySelector('img');
                if (imgElement) {
                  imageUrl = imgElement.src;
                }
              }
              
              events.push({
                title,
                description,
                dateText,
                imageUrl,
                sourceUrl: href,
                price: ''
              });
            } catch (err) {
              console.log('Error processing event link:', err);
            }
          });
        }
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process each event data
      for (const eventData of eventsData) {
        let dateInfo = this.parseDateRange(eventData.dateText);
        
        // If we don't have date info and we have a source URL, visit the event page to try to find dates
        if ((!dateInfo.startDate || !dateInfo.endDate) && eventData.sourceUrl) {
          try {
            console.log(`Visiting event page for "${eventData.title}" to find date information...`);
            await page.goto(eventData.sourceUrl, { waitUntil: 'networkidle2', timeout: 20000 });
            
            // Take a screenshot of the event page
            await page.screenshot({ path: `/tmp/rickshaw_event_page.png` });
            
            // Try to extract date from the event page
            const eventPageDateText = await page.evaluate(() => {
              // Try various date selectors
              const dateSelectors = [
                '.date', '.event-date', 'time', '.datetime', '.when',
                '.calendar', '.calendar-date', '[class*="date"]',
                '[itemprop="startDate"]', '.eventlist-meta-date'
              ];
              
              for (const selector of dateSelectors) {
                const dateElem = document.querySelector(selector);
                if (dateElem && dateElem.textContent.trim()) {
                  return dateElem.textContent.trim();
                }
              }
              
              // Look for text that looks like a date in paragraphs
              const paragraphs = Array.from(document.querySelectorAll('p, div, span'));
              for (const p of paragraphs) {
                const text = p.textContent.trim();
                // Look for text that has month names or date patterns
                if (/(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i.test(text)) {
                  return text;
                }
              }
              
              // Look for common date formats in the document text
              const bodyText = document.body.textContent;
              const dateRegex = /(\w+\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;
              const match = bodyText.match(dateRegex);
              return match ? match[0] : '';
            });
            
            if (eventPageDateText) {
              console.log(`Found date on event page: ${eventPageDateText}`);
              dateInfo = this.parseDateRange(eventPageDateText);
              // Also update the dateText in eventData
              eventData.dateText = eventPageDateText;
            }
            
            // If we still don't have dates and this is a music venue, assume it's an evening show
            if (!dateInfo.startDate || !dateInfo.endDate) {
              // Try to extract date from URL or title
              const extractDateFromUrlOrTitle = () => {
                // First check if the URL contains a date pattern
                if (eventData.sourceUrl) {
                  const urlDateMatch = eventData.sourceUrl.match(/\/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\//);
                  if (urlDateMatch) {
                    const year = parseInt(urlDateMatch[1]);
                    const month = parseInt(urlDateMatch[2]) - 1; // JS months are 0-indexed
                    const day = parseInt(urlDateMatch[3]);
                    const startDate = new Date(year, month, day, 19, 0); // 7 PM
                    const endDate = new Date(startDate);
                    endDate.setHours(endDate.getHours() + 3); // 3 hour event
                    return { startDate, endDate };
                  }
                }
                
                // Check if the title contains a date
                const titleDateMatch = eventData.title.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
                if (titleDateMatch) {
                  const month = parseInt(titleDateMatch[1]) - 1;
                  const day = parseInt(titleDateMatch[2]);
                  const currentYear = new Date().getFullYear();
                  const year = titleDateMatch[3] ? (titleDateMatch[3].length === 2 ? 2000 + parseInt(titleDateMatch[3]) : parseInt(titleDateMatch[3])) : currentYear;
                  const startDate = new Date(year, month, day, 19, 0); // 7 PM
                  const endDate = new Date(startDate);
                  endDate.setHours(endDate.getHours() + 3); // 3 hour event
                  return { startDate, endDate };
                }
                
                return { startDate: null, endDate: null };
              };
              
              const extractedDates = extractDateFromUrlOrTitle();
              if (extractedDates.startDate) {
                dateInfo = extractedDates;
                console.log(`Extracted date from URL/title: ${dateInfo.startDate}`);
              }
            }
            
          } catch (error) {
            console.error(`Error visiting event page: ${error.message}`);
          }
        }
        
        // Skip events with no valid dates, or use today's date for music venues if we still can't find a date
        if (!dateInfo.startDate || !dateInfo.endDate) {
          // For music venues like Rickshaw, if we still can't find a date, we can either skip or use a fallback
          // Let's try a conservative approach and log the missing date but skip the event
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
          eventData.sourceUrl,
          eventData.price
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

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new RickshawTheatreEvents();
