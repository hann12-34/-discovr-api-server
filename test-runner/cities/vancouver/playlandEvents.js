/**
 * Playland Events Scraper
 * Scrapes events from Playland at PNE website
 * https://www.pne.ca/playland/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class PlaylandEvents {
  constructor() {
    this.name = 'Playland at PNE Events';
    this.url = 'https://www.pne.ca/playland/';
    this.sourceIdentifier = 'playland-pne';
    this.venue = {
      name: 'Playland at PNE',
      address: '2901 E Hastings St, Vancouver, BC V5K 5J1',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.2824, lng: -123.0368 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'playland-pne');
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
   * Scrape events from Playland at PNE website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Playland at PNE Events...');
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
      console.log('Navigating to Playland at PNE main page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Playland at PNE main page');
      
      // Check if there's a dedicated events page
      const hasEventsPage = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.some(link => {
          const href = link.href.toLowerCase();
          const text = link.textContent.toLowerCase();
          return href.includes('events') || 
                 text.includes('events') || 
                 href.includes('calendar') || 
                 text.includes('calendar') || 
                 href.includes('schedule') || 
                 text.includes('schedule');
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
                   href.includes('calendar') || 
                   text.includes('calendar') || 
                   href.includes('schedule') || 
                   text.includes('schedule');
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
      
      // Also check for special events page
      const specialEventsLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const href = link.href.toLowerCase();
            const text = link.textContent.toLowerCase();
            return (href.includes('special') || text.includes('special')) && 
                   (href.includes('event') || text.includes('event'));
          })
          .map(link => link.href);
      });
      
      let events = [];
      
      // Extract events from the main page
      console.log('Extracting events from main page...');
      const mainPageEvents = await this._extractEvents(page);
      events = events.concat(mainPageEvents);
      
      // Visit special events pages if found
      for (const eventLink of specialEventsLinks) {
        try {
          console.log(`Navigating to special events page: ${eventLink}`);
          await page.goto(eventLink, { waitUntil: 'networkidle0', timeout: 30000 });
          
          const specialEvents = await this._extractEvents(page);
          events = events.concat(specialEvents);
        } catch (error) {
          console.error(`Error processing special events page ${eventLink}: ${error.message}`);
        }
      }
      
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
      
      // Extract operating hours and special events
      const events = await page.evaluate(() => {
        const events = [];
        
        // Look for season schedule or operating hours
        const scheduleHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('schedule') || 
                 text.includes('hours') || 
                 text.includes('calendar') || 
                 text.includes('season') || 
                 text.includes('dates');
        });
        
        // Process operating schedule
        scheduleHeadings.forEach(heading => {
          // Get the nearest table or list that might contain schedule
          let scheduleElement = heading.nextElementSibling;
          let maxSearch = 5;
          let search = 0;
          
          while (scheduleElement && search < maxSearch) {
            if (scheduleElement.tagName === 'TABLE' || 
                scheduleElement.tagName === 'UL' || 
                scheduleElement.tagName === 'OL' || 
                scheduleElement.querySelector('table, ul, ol, li, .date, .time')) {
              break;
            }
            scheduleElement = scheduleElement.nextElementSibling;
            search++;
          }
          
          if (scheduleElement) {
            // Extract dates from table or list
            const dateRows = scheduleElement.tagName === 'TABLE' 
              ? Array.from(scheduleElement.querySelectorAll('tr'))
              : Array.from(scheduleElement.querySelectorAll('li'));
            
            dateRows.forEach(row => {
              const rowText = row.textContent.trim();
              
              // Skip empty rows or headers
              if (!rowText || rowText.toLowerCase().includes('date') && rowText.toLowerCase().includes('time')) {
                return;
              }
              
              // Try to extract dates and times
              const monthPattern = /(?:january|february|march|april|may|june|july|august|september|october|november|december)/i;
              const hasMonth = monthPattern.test(rowText);
              
              if (hasMonth || /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(rowText)) {
                // This row likely contains a date
                const title = `Playland Opening - ${rowText}`;
                const description = `Playland at the PNE is open on ${rowText}. Come enjoy rides, attractions, and entertainment for the whole family!`;
                
                events.push({
                  title,
                  description,
                  dateText: rowText,
                  url: page.url()
                });
              }
            });
          }
        });
        
        // Look for special events
        const eventContainers = [
          '.event', 
          '.card', 
          '.post', 
          '[class*="event"]',
          '.calendar-item',
          '.event-item'
        ];
        
        // Try each event container selector
        eventContainers.forEach(selector => {
          const containers = document.querySelectorAll(selector);
          
          containers.forEach(container => {
            const titleElement = container.querySelector('h1, h2, h3, h4, h5, h6, .title');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            const dateElement = container.querySelector('.date, [class*="date"], time');
            const dateText = dateElement ? dateElement.textContent.trim() : '';
            
            const descElement = container.querySelector('p, .description, [class*="description"]');
            const description = descElement ? descElement.textContent.trim() : '';
            
            const imageElement = container.querySelector('img');
            const imageUrl = imageElement ? imageElement.src : '';
            
            const linkElement = container.querySelector('a');
            const url = linkElement ? linkElement.href : '';
            
            if (title && (dateText || description)) {
              events.push({
                title,
                description: description || title,
                dateText,
                imageUrl,
                url: url || page.url()
              });
            }
          });
        });
        
        // If we didn't find anything specific, check for general opening dates
        if (events.length === 0) {
          // Look for date patterns in the page content
          const content = document.body.textContent;
          const datePatterns = [
            /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[–-]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+)?\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?/gi,
            /\d{1,2}\/\d{1,2}\/\d{2,4}\s*(?:[–-]\s*\d{1,2}\/\d{1,2}\/\d{2,4})?/g
          ];
          
          let matches = [];
          for (const pattern of datePatterns) {
            const found = content.match(pattern);
            if (found) {
              matches = matches.concat(found);
            }
          }
          
          // Look for paragraphs with season information
          const seasonParagraphs = Array.from(document.querySelectorAll('p')).filter(p => {
            const text = p.textContent.toLowerCase();
            return (text.includes('season') || text.includes('open') || text.includes('schedule')) && 
                   (text.includes('2025') || text.includes('dates'));
          });
          
          if (seasonParagraphs.length > 0) {
            // Use the first paragraph with season info
            const seasonInfo = seasonParagraphs[0].textContent.trim();
            
            events.push({
              title: 'Playland 2025 Season',
              description: seasonInfo,
              dateText: matches.length > 0 ? matches[0] : 'Summer 2025',
              url: page.url()
            });
          } else if (matches.length > 0) {
            // Create a general event for the opening dates
            events.push({
              title: 'Playland 2025 Season',
              description: 'Playland at the PNE is open for the 2025 season. Come enjoy rides, attractions, and entertainment for the whole family!',
              dateText: matches[0],
              url: page.url()
            });
          }
        }
        
        return events;
      });
      
      // Process events and parse dates
      const processedEvents = [];
      
      for (const event of events) {
        // Parse dates
        const dates = this._parseDatesFromString(event.dateText);
        
        // Skip events with invalid dates
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates from: "${event.dateText}" for event: ${event.title}`);
          continue;
        }
        
        // Create event object with parsed data
        const processedEvent = {
          title: event.title,
          description: event.description,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          imageUrl: event.imageUrl,
          url: event.url || this.url,
          venue: this.venue,
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
    
    // Default to current year if not specified
    const currentYear = new Date().getFullYear();
    
    // Format: "Opens May 19, 2025" or similar
    const opensPattern = /(?:opens|open|opening|starts|beginning)(?:\s+on)?\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const opensMatch = dateString.match(opensPattern);
    
    if (opensMatch) {
      const month = opensMatch[1];
      const day = parseInt(opensMatch[2], 10);
      const year = opensMatch[3] ? parseInt(opensMatch[3], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(month), day, 11, 0); // Typically opens at 11am
      
      // Set end date to end of season (usually Labor Day for Playland)
      const endDate = new Date(year, 8, 1); // September 1 as an approximation
      
      // Find first Monday in September (Labor Day)
      while (endDate.getDay() !== 1) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "May 15 - September 2, 2025" (season range)
    const seasonRangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const seasonRangeMatch = dateString.match(seasonRangePattern);
    
    if (seasonRangeMatch) {
      const startMonth = seasonRangeMatch[1];
      const startDay = parseInt(seasonRangeMatch[2], 10);
      const endMonth = seasonRangeMatch[3] || startMonth;
      const endDay = parseInt(seasonRangeMatch[4], 10);
      const year = seasonRangeMatch[5] ? parseInt(seasonRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay, 11, 0); // Typically opens at 11am
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 22, 0); // Closes at 10pm
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "May 2025" (month and year only)
    const monthYearPattern = /(\w+)\s+(\d{4})/i;
    const monthYearMatch = dateString.match(monthYearPattern);
    
    if (monthYearMatch) {
      const month = monthYearMatch[1];
      const year = parseInt(monthYearMatch[2], 10);
      
      // Set to middle of the month as an estimate for the event
      const startDate = new Date(year, this._getMonthNumber(month), 15, 11, 0);
      const endDate = new Date(year, this._getMonthNumber(month) + 2, 15, 22, 0); // Assume 2 month season
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "05/19/2025" or "05/19/25" (MM/DD/YYYY)
    const numericPattern = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;
    const numericMatch = dateString.match(numericPattern);
    
    if (numericMatch) {
      const month = parseInt(numericMatch[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(numericMatch[2], 10);
      let year = parseInt(numericMatch[3], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      // Look for time information
      const timePattern = /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i;
      const timeMatch = dateString.match(timePattern);
      
      let hours = 11; // Default to 11 AM for park opening
      let minutes = 0;
      
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toLowerCase();
        
        if (period === 'pm' && hours < 12) {
          hours += 12;
        }
        if (period === 'am' && hours === 12) {
          hours = 0;
        }
      }
      
      const startDate = new Date(year, month, day, hours, minutes);
      
      // Set end date to 9 hours later (typical operating hours)
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 9);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // If all else fails, try to extract year and create a seasonal event
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = dateString.match(yearPattern);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      
      // Create a seasonal event for summer
      const startDate = new Date(year, 4, 15); // May 15th
      const endDate = new Date(year, 8, 7); // September 7th (approx. Labor Day)
      
      return { startDate, endDate };
    }
    
    // Last resort - use summer of current year if nothing else worked
    if (dateString.toLowerCase().includes('summer')) {
      const year = currentYear;
      const startDate = new Date(year, 4, 15); // May 15th
      const endDate = new Date(year, 8, 7); // September 7th
      
      return { startDate, endDate };
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString}"`);
    return null;
  }
  
  /**
   * Helper function to convert month name to month number (0-11)
   * @param {string} month Month name
   * @returns {number} Month number (0-11)
   */
  _getMonthNumber(month) {
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
        viewport: await page.evaluate(() => ({
          width: window.innerWidth,
          height: window.innerHeight
        })),
        title: await page.title()
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

module.exports = PlaylandEvents;
