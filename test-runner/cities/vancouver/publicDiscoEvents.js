/**
 * Public Disco Vancouver Events Scraper
 * Scrapes events from Public Disco website
 * https://www.publicdisco.ca/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class PublicDiscoEvents {
  constructor() {
    this.name = 'Public Disco Vancouver Events';
    this.url = 'https://www.publicdisco.ca/';
    this.sourceIdentifier = 'public-disco';
    this.venue = {
      name: 'Various Locations',
      address: 'Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2827, lng: -123.1207 } // Vancouver downtown coordinates
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'public-disco');
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(this.debugDir)) {
      try {
        fs.mkdirSync(this.debugDir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create debug directory: ${error.message}`);
      }
    }
  }

  /**
   * Scrape events from Public Disco website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Public Disco Events...');
    let browser = null;
    let page = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-blink-features=AutomationControlled',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      });
      
      page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
      
      // Set extra HTTP headers to appear more like a regular browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
    } catch (error) {
      console.error(`❌ Error launching browser: ${error.message}`);
      return [];
    }
    
    try {
      // Intercept requests to block unnecessary resources for better performance
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
    } catch (navigationError) {
      console.error(`Error setting up request interception: ${navigationError.message}`);
      throw navigationError; // Re-throw to be caught by the outer try-catch
    }
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Go to events page
      console.log('Navigating to Public Disco main page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Public Disco main page');
      
      // Check if there's a dedicated events page
      const hasEventsPage = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.some(link => {
          const href = link.href.toLowerCase();
          const text = link.textContent.toLowerCase();
          return href.includes('events') || 
                text.includes('events') || 
                href.includes('upcoming') || 
                text.includes('upcoming');
        });
      });
      
      if (hasEventsPage) {
        // Navigate to events page
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const eventsLink = links.find(link => {
            const href = link.href.toLowerCase();
            const text = link.textContent.toLowerCase();
            return href.includes('events') || 
                  text.includes('events') || 
                  href.includes('upcoming') || 
                  text.includes('upcoming');
          });
          
          if (eventsLink) {
            eventsLink.click();
          }
        });
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(e => {
          console.log('Navigation timeout or error, proceeding with current page');
        });
        
        console.log(`📄 Navigated to events page: ${page.url()}`);
      }
      
      // Extract events from the page
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
      // Filter out invalid events
      console.log('Filtering events...');
      const validEvents = events.filter(event => {
        const isValid = 
          event.title && 
          event.description && 
          event.startDate && 
          event.startDate instanceof Date && 
          !isNaN(event.startDate);
          
        if (!isValid) {
          console.log(`⚠️ Skipping invalid event: ${event.title || 'Unnamed'}`);
        }
        
        return isValid;
      });
      
      console.log(`Found ${validEvents.length} valid events out of ${events.length} total`);
      
      if (validEvents.length === 0) {
        console.log('⚠️ No valid events found after filtering. Strict validation removed all events but NO fallbacks will be used.');
        return [];
      }
      
      console.log(`🎉 Successfully scraped ${validEvents.length} events from ${this.name}`);
      return validEvents;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      
      // Save debug info for troubleshooting
      if (page) {
        try {
          await this._saveDebugInfo(page, 'error-scrape');
        } catch (debugError) {
          console.error(`Failed to save debug info: ${debugError.message}`);
        }
      }
      
      return [];
    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('🔒 Browser closed successfully');
        } catch (closeError) {
          console.error(`Failed to close browser: ${closeError.message}`);
        }
      }
    }
  }
  
  /**
   * Extract events from the page
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Look for event sections using different possible selectors
      const eventSelectors = [
        '.event-card', '.event-item', '.events-list > div', 
        '[class*="event"]', '.shows-grid > div', '.gigs-container > div',
        'article', '.post', '.entry', '.card'
      ];
      
      let selectedSelector = null;
      
      for (const selector of eventSelectors) {
        const hasSelector = await page.evaluate((sel) => {
          return document.querySelectorAll(sel).length > 0;
        }, selector);
        
        if (hasSelector) {
          selectedSelector = selector;
          break;
        }
      }
      
      // If no predefined selector works, try to identify event containers
      if (!selectedSelector) {
        selectedSelector = await page.evaluate(() => {
          // Look for elements that might contain event info
          const dateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}|\d{1,2}(?:st|nd|rd|th)? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}\/\d{1,2}\/\d{2,4}/i;
          
          // Find elements that likely contain dates
          const dateElements = Array.from(document.querySelectorAll('*'))
            .filter(el => dateRegex.test(el.textContent.trim()) && el.textContent.trim().length < 100);
          
          if (dateElements.length > 0) {
            // Try to identify common parent elements that might be event containers
            const parents = dateElements.map(el => el.parentElement);
            
            // Get most common parent tag name
            const parentTags = parents.map(p => p.tagName.toLowerCase());
            const tagCounts = {};
            let maxTag = '';
            let maxCount = 0;
            
            for (const tag of parentTags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              if (tagCounts[tag] > maxCount) {
                maxCount = tagCounts[tag];
                maxTag = tag;
              }
            }
            
            if (maxTag && maxCount > 1) {
              return maxTag;
            }
          }
          
          return null;
        });
      }
      
      // Extract events
      const events = await page.evaluate((selector) => {
        // If we found a selector, use it, otherwise scan the whole page
        const containers = selector 
          ? Array.from(document.querySelectorAll(selector))
          : [document.body];
        
        const events = [];
        const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?|\d{1,2}(?:st|nd|rd|th)? (?:of )?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:,? \d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4}/i;
        const timeRegex = /\d{1,2}:\d{2}\s*(?:am|pm)|(?:\d{1,2})(?:am|pm)/i;
        
        for (const container of containers) {
          // If we're scanning the whole page, look for sections that might contain events
          if (selector === null) {
            const sections = Array.from(container.querySelectorAll('section, div > div > div, .container > div'));
            
            for (const section of sections) {
              if (section.textContent.match(dateRegex)) {
                // This section likely contains event info
                
                // Try to find title, date, and description within this section
                const titleElement = section.querySelector('h1, h2, h3, h4, h5, h6, strong');
                const title = titleElement ? titleElement.textContent.trim() : '';
                
                // Find date text
                const dateMatch = section.textContent.match(dateRegex);
                const dateText = dateMatch ? dateMatch[0] : '';
                
                // Find time text
                const timeMatch = section.textContent.match(timeRegex);
                const timeText = timeMatch ? timeMatch[0] : '';
                
                // Combine date and time
                const fullDateText = `${dateText} ${timeText}`.trim();
                
                // Find description - look for paragraph or div with text
                const descElements = Array.from(section.querySelectorAll('p, div')).filter(el => 
                  el.textContent.trim().length > 30 && 
                  el !== titleElement && 
                  !el.textContent.includes(dateText) &&
                  !el.textContent.includes(timeText)
                );
                
                const description = descElements.length > 0 
                  ? descElements[0].textContent.trim()
                  : '';
                
                // Find image
                const image = section.querySelector('img');
                const imageUrl = image ? image.src : '';
                
                // Find link/ticket URL
                const linkElement = section.querySelector('a[href*="tickets"], a[href*="event"], a');
                const linkUrl = linkElement ? linkElement.href : '';
                
                if (title && (dateText || description)) {
                  events.push({
                    title,
                    description,
                    dateText: fullDateText,
                    imageUrl,
                    url: linkUrl
                  });
                }
              }
            }
          } else {
            // We have a specific selector, extract event details
            // Try to find title
            const titleElement = container.querySelector('h1, h2, h3, h4, h5, h6, .title, .event-title, [class*="title"]');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            // Find date text
            const dateElement = container.querySelector('.date, [class*="date"], time');
            let dateText = dateElement ? dateElement.textContent.trim() : '';
            
            // If no date element, look for date pattern in text
            if (!dateText) {
              const dateMatch = container.textContent.match(dateRegex);
              dateText = dateMatch ? dateMatch[0] : '';
            }
            
            // Find time text
            const timeElement = container.querySelector('.time, [class*="time"]');
            let timeText = timeElement ? timeElement.textContent.trim() : '';
            
            // If no time element, look for time pattern in text
            if (!timeText) {
              const timeMatch = container.textContent.match(timeRegex);
              timeText = timeMatch ? timeMatch[0] : '';
            }
            
            // Combine date and time
            const fullDateText = `${dateText} ${timeText}`.trim();
            
            // Find description
            const descElement = container.querySelector('p, .description, [class*="description"], .excerpt, [class*="excerpt"]');
            const description = descElement ? descElement.textContent.trim() : '';
            
            // Find image
            const image = container.querySelector('img');
            const imageUrl = image ? image.src : '';
            
            // Find link/ticket URL
            const linkElement = container.querySelector('a[href*="tickets"], a[href*="event"], a');
            const linkUrl = linkElement ? linkElement.href : '';
            
            // Location information
            const locationElement = container.querySelector('.location, [class*="location"], .venue, [class*="venue"]');
            const location = locationElement ? locationElement.textContent.trim() : '';
            
            if (title && (dateText || description)) {
              events.push({
                title,
                description,
                dateText: fullDateText,
                imageUrl,
                url: linkUrl,
                location
              });
            }
          }
        }
        
        return events;
      }, selectedSelector);
      
      // Process the extracted events
      const processedEvents = [];
      
      for (const event of events) {
        // Skip events without sufficient data
        if (!event.title || (!event.dateText && !event.description)) {
          console.log(`⚠️ Skipping event with insufficient data: ${event.title || 'Unnamed'}`);
          continue;
        }
        
        // Parse dates
        const dates = this._parseDatesFromString(event.dateText);
        
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates from: "${event.dateText}" for event: ${event.title}`);
          continue;
        }
        
        // Create venue object with location if provided
        const venue = { ...this.venue };
        if (event.location) {
          venue.name = event.location;
        }
        
        // Create event object
        const processedEvent = {
          title: event.title,
          description: event.description,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          imageUrl: event.imageUrl,
          url: event.url || this.url,
          venue: venue,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-${slugify(event.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`
        };
        
        processedEvents.push(processedEvent);
      }
      
      return processedEvents;
    } catch (error) {
      console.error(`Error extracting events: ${error.message}`);
      await this._saveDebugInfo(page, 'extraction-error');
      return [];
    }
  }
  
  /**
   * Parse dates from string
   * @param {string} dateString Date string to parse
   * @returns {Object|null} Object with startDate and endDate (optional)
   */
  _parseDatesFromString(dateString) {
    if (!dateString) return null;
    
    // Default to current year if no year in date string
    const currentYear = new Date().getFullYear();
    let processedDateString = dateString;
    
    // Format: "July 15th, 2025" or "July 15th"
    const monthDayPattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const monthDayMatch = processedDateString.match(monthDayPattern);
    
    if (monthDayMatch) {
      const month = monthDayMatch[1];
      const day = parseInt(monthDayMatch[2], 10);
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : currentYear;
      
      // Extract time if present
      const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i;
      const timeMatch = processedDateString.match(timePattern);
      
      let hours = 21; // Default to 9 PM if no time specified (common for music events)
      let minutes = 0;
      
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        if (period === 'pm' && hours < 12) {
          hours += 12;
        }
        if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        // If no AM/PM specified and hour is small, assume PM for evening events
        if (!period && hours < 7) {
          hours += 12;
        }
      }
      
      const startDate = new Date(year, getMonthNumber(month), day, hours, minutes);
      
      // Set end date to 4 hours later (typical dance event duration)
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 4);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "15/07/2025" or "15/07/25" (day/month/year)
    const numericPattern = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const numericMatch = processedDateString.match(numericPattern);
    
    if (numericMatch) {
      let day, month, year;
      
      // Check for North American MM/DD/YYYY vs. European DD/MM/YYYY
      // For simplicity, assume European format
      day = parseInt(numericMatch[1], 10);
      month = parseInt(numericMatch[2], 10) - 1; // JS months are 0-indexed
      year = parseInt(numericMatch[3], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      // Extract time if present
      const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/i;
      const timeMatch = processedDateString.match(timePattern);
      
      let hours = 21; // Default to 9 PM if no time specified
      let minutes = 0;
      
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        if (period === 'pm' && hours < 12) {
          hours += 12;
        }
        if (period === 'am' && hours === 12) {
          hours = 0;
        }
      }
      
      const startDate = new Date(year, month, day, hours, minutes);
      
      // Set end date to 4 hours later
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 4);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString}"`);
    return null;
    
    // Helper function to convert month name to month number (0-11)
    function getMonthNumber(month) {
      const months = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };
      
      return months[month.toLowerCase()] || 0;
    }
  }
  
  /**
   * Save debug information
   * @param {Page} page Puppeteer page object
   * @param {string} prefix Prefix for debug files
   */
  async _saveDebugInfo(page, prefix) {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const debugPrefix = `${prefix}_${timestamp}`;
      
      // Create a directory for this debug session
      const sessionDir = path.join(this.debugDir, debugPrefix);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      
      // Save a screenshot
      await page.screenshot({
        path: path.join(sessionDir, 'screenshot.png'),
        fullPage: true
      });
      
      // Save the HTML content
      const html = await page.content();
      fs.writeFileSync(path.join(sessionDir, 'page.html'), html);
      
      // Save page metrics
      const metrics = await page.metrics();
      fs.writeFileSync(
        path.join(sessionDir, 'metrics.json'),
        JSON.stringify(metrics, null, 2)
      );
      
      // Save cookies
      const cookies = await page.cookies();
      fs.writeFileSync(
        path.join(sessionDir, 'cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      
      // Save debugging metadata
      const debugMeta = {
        url: page.url(),
        timestamp: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        title: await page.title(),
        pageText: await page.evaluate(() => {
          // Get a sample of the page text for debugging
          const textContent = document.body.textContent;
          return textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
        })
      };
      
      fs.writeFileSync(
        path.join(sessionDir, 'debug_meta.json'),
        JSON.stringify(debugMeta, null, 2)
      );
      
      console.log(`📝 Debug info saved to ${sessionDir}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  }
}

module.exports = PublicDiscoEvents;
