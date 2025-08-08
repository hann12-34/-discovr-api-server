const { getCityFromArgs } = require('../../utils/city-util.js');
/**
 * Vancouver Art Gallery Events Scraper
 * Scrapes events and exhibitions from the Vancouver Art Gallery
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs');

/**
 * Vancouver Art Gallery Events Scraper
 */
const ArtGalleryEvents = {
  name: 'Vancouver Art Gallery',
  url: 'https://www.vanartgallery.bc.ca/exhibitions-and-events/',
  exhibitionsUrl: 'https://www.vanartgallery.bc.ca/exhibitions',
  eventsUrl: 'https://www.vanartgallery.bc.ca/events',
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
      
      // Handle format: "January 1, 2025 – April 30, 2025"
      const fullDateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})\s*[–\-]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const fullDateRangeMatch = dateString.match(fullDateRangePattern);
      
      if (fullDateRangeMatch) {
        const startMonth = fullDateRangeMatch[1];
        const startDay = parseInt(fullDateRangeMatch[2]);
        const startYear = parseInt(fullDateRangeMatch[3]);
        const endMonth = fullDateRangeMatch[4];
        const endDay = parseInt(fullDateRangeMatch[5]);
        const endYear = parseInt(fullDateRangeMatch[6]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(startYear, startMonthNum, startDay, 10, 0, 0); // Gallery opens at 10am
          const endDate = new Date(endYear, endMonthNum, endDay, 17, 0, 0); // Gallery closes at 5pm
          
          return { startDate, endDate };
        }
      }
      
      // Handle format: "January 1 – April 30, 2025" (same year)
      const sameYearDateRangePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[–\-]\s*([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const sameYearDateRangeMatch = dateString.match(sameYearDateRangePattern);
      
      if (sameYearDateRangeMatch) {
        const startMonth = sameYearDateRangeMatch[1];
        const startDay = parseInt(sameYearDateRangeMatch[2]);
        const endMonth = sameYearDateRangeMatch[3];
        const endDay = parseInt(sameYearDateRangeMatch[4]);
        const year = parseInt(sameYearDateRangeMatch[5]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const startMonthNum = months[startMonth.toLowerCase()];
        const endMonthNum = months[endMonth.toLowerCase()];
        
        if (startMonthNum !== undefined && endMonthNum !== undefined) {
          const startDate = new Date(year, startMonthNum, startDay, 10, 0, 0); // Gallery opens at 10am
          const endDate = new Date(year, endMonthNum, endDay, 17, 0, 0); // Gallery closes at 5pm
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date format with time: "January 1, 2025, 10am – 5pm"
      const singleDateTimePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})(?:,\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–\-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i;
      const singleDateTimeMatch = dateString.match(singleDateTimePattern);
      
      if (singleDateTimeMatch) {
        const month = singleDateTimeMatch[1];
        const day = parseInt(singleDateTimeMatch[2]);
        const year = parseInt(singleDateTimeMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          let startHour = 10; // Default to 10am
          let endHour = 17;   // Default to 5pm
          
          // If time information is provided
          if (singleDateTimeMatch[4]) {
            startHour = parseInt(singleDateTimeMatch[4]);
            const startMinute = singleDateTimeMatch[5] ? parseInt(singleDateTimeMatch[5]) : 0;
            const startMeridiem = singleDateTimeMatch[6].toLowerCase();
            
            // Convert to 24-hour format
            if (startMeridiem === 'pm' && startHour < 12) startHour += 12;
            if (startMeridiem === 'am' && startHour === 12) startHour = 0;
            
            // End time if provided
            if (singleDateTimeMatch[7]) {
              endHour = parseInt(singleDateTimeMatch[7]);
              const endMinute = singleDateTimeMatch[8] ? parseInt(singleDateTimeMatch[8]) : 0;
              const endMeridiem = singleDateTimeMatch[9].toLowerCase();
              
              // Convert to 24-hour format
              if (endMeridiem === 'pm' && endHour < 12) endHour += 12;
              if (endMeridiem === 'am' && endHour === 12) endHour = 0;
            }
          }
          
          const startDate = new Date(year, monthNum, day, startHour, 0, 0);
          const endDate = new Date(year, monthNum, day, endHour, 0, 0);
          
          return { startDate, endDate };
        }
      }
      
      // Handle single date format: "January 1, 2025"
      const singleDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i;
      const singleDateMatch = dateString.match(singleDatePattern);
      
      if (singleDateMatch) {
        const month = singleDateMatch[1];
        const day = parseInt(singleDateMatch[2]);
        const year = parseInt(singleDateMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          // For single date events like exhibitions, they usually run all day
          const startDate = new Date(year, monthNum, day, 10, 0, 0); // Gallery opens at 10am
          const endDate = new Date(year, monthNum, day, 17, 0, 0);   // Gallery closes at 5pm
          
          return { startDate, endDate };
        }
      }
      
      // Handle "Ongoing" or "Permanent Exhibition" case
      if (dateString.toLowerCase().includes('ongoing') || dateString.toLowerCase().includes('permanent')) {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setHours(10, 0, 0); // Gallery opens at 10am
        
        const endDate = new Date(currentDate);
        endDate.setFullYear(currentDate.getFullYear() + 1); // Set end date to 1 year from now
        endDate.setHours(17, 0, 0); // Gallery closes at 5pm
        
        return { startDate, endDate };
      }
      
      // Standard date parsing as fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = new Date(parsedDate);
        startDate.setHours(10, 0, 0); // Gallery opens at 10am
        
        const endDate = new Date(startDate);
        endDate.setHours(17, 0, 0); // Gallery closes at 5pm
        
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
    
    return `vag-${slug}-${dateStr}`;
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, type) {
    // Define categories based on event type
    let categories = ['art', 'exhibition', 'culture'];
    
    if (type) {
      type = type.toLowerCase();
      if (type.includes('workshop') || type.includes('class')) {
        categories.push('workshop');
        categories.push('education');
      } else if (type.includes('talk') || type.includes('lecture') || type.includes('tour')) {
        categories.push('talk');
        categories.push('education');
      } else if (type.includes('performance')) {
        categories.push('performance');
      } else if (type.includes('family') || type.includes('children')) {
        categories.push('family-friendly');
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
      ticketUrl: 'https://www.vanartgallery.bc.ca/visit',
      venue: {
        name: 'Vancouver Art Gallery',
        address: '750 Hornby St',
        city: getCityFromArgs(),
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6Z 2H7',
        website: 'https://www.vanartgallery.bc.ca/',
        googleMapsUrl: 'https://goo.gl/maps/CXvHLUYfX5mcgU8L9'
      },
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'vancouver-art-gallery'
    };
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
    let page;

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',  // Helps with memory issues
          '--disable-features=IsolateOrigins,site-per-process' // Helps with frames
        ]
      });

      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 }); // Larger viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      
      // Set a very generous timeout
      page.setDefaultNavigationTimeout(60000); // 60 seconds
      page.setDefaultTimeout(60000); // 60 seconds
      
      // Log console messages from page
      page.on('console', msg => console.log(`Browser console: ${msg.text()}`))

      // Strategy: Navigate directly to exhibitions page where we're more likely to find quality event content
      console.log(`Navigating to exhibitions page: ${this.exhibitionsUrl}`);
      await page.goto(this.exhibitionsUrl, { 
        waitUntil: 'networkidle2', // Wait until network is idle for more complete loading
        timeout: 60000 
      });

      // Wait for the page to be fully loaded
      console.log('Waiting for page to load...');
      await page.waitForSelector('body', { visible: true, timeout: 30000 });
      
      // Take a diagnostic screenshot to help debug
      await page.screenshot({ path: 'vag-exhibitions-page.png', fullPage: true });

      // Check for and close cookie banners - try multiple common selectors
      const cookieBannerSelectors = [
        '#cky-btn-accept', 
        '.cookie-accept', 
        '[aria-label="Accept cookies"]',
        '.accept-cookies',
        '.cookie-banner button',
        'button:contains("Accept")',
        '#cookie-accept'
      ];
      
      for (const selector of cookieBannerSelectors) {
        try {
          const cookieButton = await page.$(selector);
          if (cookieButton) {
            console.log(`Cookie banner found with selector ${selector}. Clicking accept...`);
            await cookieButton.click();
            await page.waitForTimeout(2000); // Wait for banner to disappear
            break;
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }

      console.log('Looking for exhibitions on the page...');
      
      // Exhibition page specific scraping logic
      let eventsData = await page.evaluate(() => {
        try {
          const items = [];
          
          // Exhibition cards are likely to be articles, divs with specific classes, or groups
          const exhibitionSelectors = [
            '.exhibition-card', 
            '.exhibitions-list > div',
            '.exhibitions-list article',
            '.exhibition-item',
            'article.wp-block-post',
            '.wp-block-group:has(h2, h3)',  // Groups containing headers
            '.wp-block-cover',              // Cover blocks often used for exhibitions
            '.wp-block-media-text',         // Media text blocks for exhibitions
            '.event-container',             // Explicit event containers
            '.wp-block-columns .wp-block-column', // Column layouts with exhibitions
            'ul > li' // List items that might contain events
          ];
          
          // Try all selectors to find exhibition cards
          for (const selector of exhibitionSelectors) {
            const containers = document.querySelectorAll(selector);
            console.log(`Found ${containers.length} items with selector: ${selector}`);
            
            if (containers && containers.length > 0) {                  
              // Process exhibition containers
              Array.from(containers).forEach(container => {
                const title = container.querySelector('h3 a, h4 a, a')?.textContent.trim() || '';
                const sourceUrl = container.querySelector('a')?.href || '';
                let dateText = '';
                let category = 'Exhibition';
                
                // Look for date information in various formats
                const dateElement = container.querySelector('.date, .event-date, time, [datetime]');
                if (dateElement) {
                  dateText = dateElement.textContent.trim();
                } else {
                  // Try paragraphs or spans
                  const textElements = container.querySelectorAll('p, span');
                  for (const el of textElements) {
                    const text = el.textContent.trim();
                    // Look for date-like patterns
                    if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) || 
                        /\b\d{1,2}[,-]\s*\d{1,2}\b/.test(text) || 
                        /\b\d{4}\b/.test(text)) {
                      dateText = text;
                      break;
                    }
                    
                    // Try to determine event type
                    if (text.toLowerCase().includes('exhibition')) category = 'Exhibition';
                    else if (text.toLowerCase().includes('tour')) category = 'Tour';
                    else if (text.toLowerCase().includes('workshop')) category = 'Workshop';
                  }
                }
                
                if (!dateText) {
                  dateText = 'Ongoing';
                }
                
                if (title && sourceUrl) {
                  items.push({ 
                    title, 
                    dateText, 
                    sourceUrl, 
                    type: category
                  });
                }
              });
            }
          }
          
          return { items, hasError: false };
        } catch (e) {
          console.error('Error in extraction attempt:', e);
          return { items: [], hasError: true, error: e.message };
        }
      });
            if (!eventsList && eventsHeader.parentElement) {
              let currentNode = eventsHeader.nextElementSibling;
              while (currentNode && !eventsList) {
                if (currentNode.tagName === 'UL') {
                  eventsList = currentNode;
                } else if (currentNode.querySelector('ul')) {
                  eventsList = currentNode.querySelector('ul');
                }
                currentNode = currentNode.nextElementSibling;
              }
            }
            
            // Process events from the list if found
            if (eventsList) {
              const eventElements = eventsList.querySelectorAll('li');
              eventElements.forEach(element => {
                // Try multiple selector patterns to extract data
                const title = element.querySelector('h3 a, h4 a, strong a, a')?.textContent.trim() || '';
                const sourceUrl = element.querySelector('a')?.href || '';
                
                // Try to find date text in different ways
                let dateText = '';
                const paragraphs = element.querySelectorAll('p');
                if (paragraphs.length >= 2) {
                  // Date might be in second paragraph
                  dateText = paragraphs[1].innerText.trim().replace(/\n/g, ' | ');
                } else if (paragraphs.length === 1) {
                  dateText = paragraphs[0].innerText.trim().replace(/\n/g, ' | ');
                } else {
                  // Try to find date in text nodes or spans
                  const spans = element.querySelectorAll('span');
                  for (const span of spans) {
                    const text = span.textContent.trim();
                    if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) {
                      dateText = text;
                      break;
                    }
                  }
                  
                  if (!dateText) {
                    dateText = element.innerText.trim().replace(/\n/g, ' | ');
                  }
                }
                
                // Try to determine event type
                let category = 'Event';
                if (paragraphs.length >= 1) {
                  const firstParaText = paragraphs[0].textContent.trim().toLowerCase();
                  if (firstParaText.includes('exhibition')) category = 'Exhibition';
                  else if (firstParaText.includes('tour')) category = 'Tour';
                  else if (firstParaText.includes('workshop')) category = 'Workshop';
                  else category = paragraphs[0].textContent.trim() || 'Event';
                }
                
                if (title && sourceUrl) {
                  items.push({ title, dateText, sourceUrl, type: category });
                }
              });
            }
          } catch (innerError) {
            console.error('Error processing event list:', innerError);
          }
          
          return { items, hasError: false };
        } catch (e) {
          console.error('Error in first extraction attempt:', e);
          return { items: [], hasError: true, error: e.message };
        }
      });
      
      // Second attempt: If no events found with headers approach, try to find event patterns anywhere
      if (!eventsData.items || eventsData.items.length === 0) {
        console.log('No events found by header approach, trying generic event detection...');
        
        eventsData = await page.evaluate(() => {
          try {
            const items = [];
            
            // Look for any elements that might be events
            // Event cards often have distinct classes or structures
            const eventContainers = [
              // Try multiple selector patterns that might contain events
              '.event-card',
              '.event-item',
              '.wp-block-post',
              'article',
              '.wp-block-group ul > li',
              // Fallback to any list items with links
              'ul li a[href*="event"]',
              'ul li a[href*="exhibition"]'
            ];
            
            for (const selector of eventContainers) {
              const elements = document.querySelectorAll(selector);
              if (elements && elements.length > 0) {
                console.log(`Found ${elements.length} potential events with selector: ${selector}`);
                
                elements.forEach(element => {
                  // For list items with links, get the parent li
                  const container = element.tagName === 'A' ? element.closest('li') : element;
                  if (!container) return;
                  
                  // Extract event information
                  const linkElement = container.tagName === 'A' ? container : container.querySelector('a');
                  const title = (linkElement?.textContent || container.querySelector('h3, h4, h5, strong')?.textContent || '').trim();
                  const sourceUrl = linkElement?.href || '';
                  
                  // Look for date text
                  let dateText = '';
                  const textContent = container.textContent.trim();
                  
                  // Try to extract date patterns from the text
                  const datePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}[\s,-]*\d{0,4}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,-]*\d{0,4}/i;
                  const dateMatch = textContent.match(datePattern);
                  
                  if (dateMatch) {
                    dateText = dateMatch[0];
                  } else {
                    // If no clear date pattern, use any text that might contain date info
                    dateText = textContent.replace(title, '').trim();
                  }
                  
                  if (title && sourceUrl) {
                    // Check if we already have this item (avoid duplicates)
                    const isDuplicate = items.some(item => 
                      item.title === title && item.sourceUrl === sourceUrl
                    );
                    
                    if (!isDuplicate) {
                      items.push({ 
                        title, 
                        dateText: dateText || 'Ongoing Event', 
                        sourceUrl, 
                        type: 'Event' 
                      });
                    }
                  }
                });
                
                // If we found events with this selector, we can stop looking
                if (items.length > 0) break;
              }
            }
            
            return { items, hasError: false };
          } catch (e) {
            return { items: [], hasError: true, error: e.message };
          }
        });
      }

      // If no events found with header-based or generic approach, try the exhibitions page as well
      if (!eventsData.items || eventsData.items.length === 0) {
        console.log('No events found yet, trying to navigate to the exhibitions page...');
        
        try {
          // Navigate to the dedicated exhibitions page for additional event data
          const exhibitionsUrl = 'https://www.vanartgallery.bc.ca/exhibitions';
          await page.goto(exhibitionsUrl, { waitUntil: 'networkidle2', timeout: 45000 });
          
          // Take a screenshot of the exhibitions page
          await page.screenshot({ path: 'vag-exhibitions-page.png', fullPage: true });
          
          eventsData = await page.evaluate(() => {
            try {
              const items = [];
              
              // Look for exhibition cards or entries
              const exhibitionCards = document.querySelectorAll('article, .exhibition-card, .wp-block-group');
              
              exhibitionCards.forEach(card => {
                // Check if this looks like an exhibition entry
                const title = card.querySelector('h2, h3, h4, a')?.textContent.trim() || '';
                const linkElement = card.querySelector('a[href*="exhibition"], a[href*="exhibitions"], a');
                const sourceUrl = linkElement?.href || '';
                
                // Try to find date information
                let dateText = '';
                const dateElement = card.querySelector('.date, .event-date, time, span');
                if (dateElement) {
                  dateText = dateElement.textContent.trim();
                } else {
                  const paragraphs = card.querySelectorAll('p');
                  for (const p of paragraphs) {
                    const text = p.textContent.trim();
                    if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text) || 
                        /\b\d{1,2}\s*[-–—]\s*\d{1,2}\b/.test(text) || 
                        /\b\d{4}\b/.test(text)) {
                      dateText = text;
                      break;
                    }
                  }
                }
                
                if (title && sourceUrl) {
                  items.push({ 
                    title, 
                    dateText: dateText || 'Current Exhibition', 
                    sourceUrl,
                    type: 'Exhibition'
                  });
                }
              });
              
              return { items, hasError: false };
            } catch (e) {
              return { items: [], hasError: true, error: e.message };
            }
          });
        } catch (navError) {
          console.error(`Error navigating to exhibitions page: ${navError.message}`);
          // Continue with any events we might have found on the main page
        }
      }
      
      // Process the extracted event data
      let foundItems = eventsData.items || [];
      console.log(`Found ${foundItems.length} potential events/exhibitions before filtering.`);
      
      // Filter out navigation menu items and other non-event content
      const navigationTerms = ['book tickets', 'get a pass', 'hours', 'pricing', 'dine', 'group visits', 'what\'s on',
        'membership', 'donate', 'volunteer', 'about us', 'history', 'annual reports', 'careers', 'media room',
        'shop', 'gallery store', 'contact', 'facebook', 'linkedin', 'instagram', 'youtube', 'vimeo',
        'library', 'archives', 'rights', 'reproductions'];
      
      const exhibitionSections = ['current exhibitions', 'upcoming exhibitions', 'past exhibitions', 'events and public programs'];
      
      // First pass: Keep exhibition section headers for navigation to these pages
      foundItems = foundItems.filter(item => {
        const title = item.title.toLowerCase();
        
        // Keep items that are likely exhibition sections
        if (exhibitionSections.some(term => title.includes(term))) {
          item.isSectionHeader = true;
          return true;
        }
        
        // Filter out items that are likely navigation menu items
        return !navigationTerms.some(term => title.includes(term));
      });
      
      console.log(`Found ${foundItems.length} events/exhibitions after filtering navigation items.`);

      for (const item of foundItems) {
        try {
          const { title, dateText, sourceUrl, type } = item;
          console.log(`Processing item: "${title}" with date text: "${dateText}"`);
          
          // Try to parse the date information
          const { startDate, endDate } = this.parseDateRange(dateText);

          if (!startDate || !endDate) {
            console.log(`Could not parse date for "${title}" from date string: "${dateText}". Using fallback dates.`);
            
            // Use fallback dates for items without clear dates
            const today = new Date();
            const threeMonthsLater = new Date();
            threeMonthsLater.setMonth(today.getMonth() + 3);
            
            const eventId = this.generateEventId(title, today);
            const event = this.createEventObject(eventId, title, '', today, threeMonthsLater, '', sourceUrl, type);
            events.push(event);
            continue;
          }

          const eventId = this.generateEventId(title, startDate);
          const event = this.createEventObject(eventId, title, '', startDate, endDate, '', sourceUrl, type);
          events.push(event);
        } catch (itemError) {
          console.warn(`Error processing item: ${itemError.message}`);
          // Continue processing other items
        }
      }

      console.log(`✅ Successfully scraped ${events.length} events from ${this.name}`);

    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      if (page) {
        try {
          // Capture diagnostic information on error
          const screenshotPath = `error_${this.name.replace(/\s+/g, '_')}.png`;
          console.log(`📸 Saving screenshot to ${screenshotPath}`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          
          // Save full HTML for detailed diagnosis
          const htmlContent = await page.content();
          const htmlPath = `error_${this.name.replace(/\s+/g, '_')}.html`;
          fs.writeFileSync(htmlPath, htmlContent);
          console.log(`📄 Saved HTML content to ${htmlPath}`);
          
          // Log a small snippet for immediate debugging
          console.log('Page HTML snippet:', htmlContent.substring(0, 500));
        } catch (diagnosticError) {
          console.error(`Failed to capture error diagnostics: ${diagnosticError.message}`);
        }
      }
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
module.exports = new ArtGalleryEvents();
