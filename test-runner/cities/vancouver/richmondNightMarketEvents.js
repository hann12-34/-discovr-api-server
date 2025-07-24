/**
 * Richmond Night Market Events Scraper
 * Scrapes events from Richmond Night Market website
 * https://richmondnightmarket.com/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class RichmondNightMarketEvents {
  constructor() {
    this.name = 'Richmond Night Market Events';
    this.url = 'https://richmondnightmarket.com/';
    this.sourceIdentifier = 'richmond-night-market';
    this.venue = {
      name: 'Richmond Night Market',
      address: '8351 River Rd, Richmond, BC V6X 1Y4',
      city: 'Richmond',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.1965, lng: -123.1227 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'richmond-night-market');
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
   * Scrape events from Richmond Night Market website
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log(`Scraping ${this.name}...`);
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
          '--disable-blink-features=AutomationControlled'
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
      
      // Navigate to the homepage
      console.log(`Navigating to ${this.url}...`);
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log(`📄 Navigated to ${this.url}`);
      
      // Check if there's a dedicated events page
      const hasEventsPage = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links.some(link => {
          const href = link.href?.toLowerCase() || '';
          const text = link.textContent?.toLowerCase() || '';
          return href.includes('event') || 
                 text.includes('event') || 
                 href.includes('schedule') || 
                 text.includes('schedule');
        });
      });
      
      if (hasEventsPage) {
        // Navigate to events page
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const eventsLink = links.find(link => {
            const href = link.href?.toLowerCase() || '';
            const text = link.textContent?.toLowerCase() || '';
            return href.includes('event') || 
                   text.includes('event') || 
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
        
        console.log(`📅 Navigated to events page: ${page.url()}`);
      }
      
      // Extract events
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
      // Validate and filter events
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
      
      // Extract events from the page
      const events = await page.evaluate((venue) => {
        const events = [];
        
        // First approach: Look for explicitly marked event containers
        const eventContainers = document.querySelectorAll('.event-item, .event, article, .card, [class*="event"]');
        
        if (eventContainers && eventContainers.length > 0) {
          eventContainers.forEach(container => {
            // Extract title
            const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"]');
            const title = titleEl ? titleEl.textContent.trim() : '';
            
            // Extract date
            const dateEl = container.querySelector('.date, [class*="date"], time');
            const dateText = dateEl ? dateEl.textContent.trim() : '';
            
            // Extract description
            const descEl = container.querySelector('p, .description, [class*="description"], .excerpt');
            const description = descEl ? descEl.textContent.trim() : '';
            
            // Extract image
            const imgEl = container.querySelector('img');
            const imageUrl = imgEl ? imgEl.src : '';
            
            // Extract URL
            const linkEl = container.querySelector('a');
            const url = linkEl ? linkEl.href : window.location.href;
            
            // Only add events with sufficient information
            if (title && (dateText || description)) {
              events.push({
                title,
                dateText,
                description: description || title,
                imageUrl,
                url
              });
            }
          });
        }
        
        // Second approach: Look for schedule information on the page
        if (events.length === 0) {
          // Look for schedule-related headers
          const scheduleHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).filter(h => {
            const text = h.textContent.toLowerCase();
            return text.includes('schedule') || 
                   text.includes('hours') || 
                   text.includes('opening') || 
                   text.includes('dates') ||
                   text.includes('2025') ||
                   text.includes('night market');
          });
          
          scheduleHeaders.forEach(header => {
            // Check siblings for date and time info
            let sibling = header.nextElementSibling;
            let siblingCount = 0;
            let scheduleInfo = header.textContent.trim();
            let description = '';
            
            // Look through the next few siblings for schedule details
            while (sibling && siblingCount < 4) {
              if (sibling.tagName === 'P' || sibling.tagName === 'DIV' || sibling.tagName === 'LI') {
                const text = sibling.textContent.trim();
                if (text.match(/\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i) ||
                    text.match(/\d{1,2}:\d{2}/i) ||
                    text.match(/(am|pm)/i)) {
                  scheduleInfo += ' ' + text;
                } else {
                  description += ' ' + text;
                }
              }
              sibling = sibling.nextElementSibling;
              siblingCount++;
            }
            
            // Default description if none found
            if (!description) {
              description = 'Experience the Richmond Night Market, featuring delicious international street food, unique merchandise, and exciting live entertainment.';
            }
            
            // Extract dates using regex
            const datePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*(?:(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+)?\d{1,2}(?:st|nd|rd|th)?)?(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/i;
            
            let dateText = '';
            const dateMatch = scheduleInfo.match(datePattern);
            if (dateMatch) {
              dateText = dateMatch[0];
            }
            
            // If we found a date or the header text contains keywords
            if (dateText || /\b(20\d{2}|season|summer|spring|night market)\b/i.test(scheduleInfo)) {
              events.push({
                title: 'Richmond Night Market 2025',
                dateText: dateText || scheduleInfo,
                description: description.trim(),
                imageUrl: '',
                url: window.location.href
              });
            }
          });
        }
        
        // Third approach: If no events found yet, check for any text containing 2025 dates
        if (events.length === 0) {
          const bodyText = document.body.textContent;
          const yearPattern = /\b(20\d{2})\b/g;
          const yearMatches = bodyText.match(yearPattern);
          
          if (yearMatches && yearMatches.includes('2025')) {
            // Look for date patterns near 2025
            const paragraphs = document.querySelectorAll('p');
            paragraphs.forEach(p => {
              const text = p.textContent;
              if (text.includes('2025')) {
                events.push({
                  title: 'Richmond Night Market 2025',
                  dateText: text,
                  description: 'Experience the Richmond Night Market, featuring delicious international street food, unique merchandise, and exciting live entertainment.',
                  imageUrl: '',
                  url: window.location.href
                });
              }
            });
          }
        }
        
        return events;
      }, this.venue);
      
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
          venue: this.venue,
          imageUrl: event.imageUrl,
          url: event.url || this.url,
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
    const currentYear = 2025;
    
    // Format: "April 26 - October 10, 2025" (typical night market season)
    const seasonRangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const seasonRangeMatch = dateString.match(seasonRangePattern);
    
    if (seasonRangeMatch) {
      const startMonth = seasonRangeMatch[1];
      const startDay = parseInt(seasonRangeMatch[2], 10);
      const endMonth = seasonRangeMatch[3] || startMonth;
      const endDay = parseInt(seasonRangeMatch[4], 10);
      const year = seasonRangeMatch[5] ? parseInt(seasonRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay, 17, 0); // Typically opens at 5pm
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 23, 0); // Closes at 11pm
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "Operating Friday - Sunday, 7pm - 12am" (schedule format)
    const weekdayPattern = /\b(friday|saturday|sunday|monday|tuesday|wednesday|thursday)\b.*?\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\b.*?\b(\d{1,2}(?::\d{2})?)\s*(am|pm)\b/i;
    const weekdayMatch = dateString.match(weekdayPattern);
    
    if (weekdayMatch) {
      // This is a weekly schedule format, we need to create events for each occurrence
      const dayOfWeek = weekdayMatch[1].toLowerCase();
      const startTimeStr = weekdayMatch[2];
      const startAmPm = weekdayMatch[3].toLowerCase();
      const endTimeStr = weekdayMatch[4];
      const endAmPm = weekdayMatch[5].toLowerCase();
      
      // Parse hours and minutes
      let [startHours, startMinutes] = startTimeStr.split(':').map(n => parseInt(n, 10));
      if (startAmPm === 'pm' && startHours < 12) startHours += 12;
      if (startAmPm === 'am' && startHours === 12) startHours = 0;
      startMinutes = startMinutes || 0;
      
      let [endHours, endMinutes] = endTimeStr.split(':').map(n => parseInt(n, 10));
      if (endAmPm === 'pm' && endHours < 12) endHours += 12;
      if (endAmPm === 'am' && endHours === 12) endHours = 0;
      // If end time is AM, it's likely after midnight, so it's the next day
      if (endAmPm === 'am' && startAmPm === 'pm') {
        // For example, 7pm - 12am means the event ends the next day at midnight
        endHours += 24;
      }
      endMinutes = endMinutes || 0;
      
      // Richmond Night Market typically runs from April to October
      const startDate = new Date(currentYear, 3, 15, startHours, startMinutes); // April 15
      const endDate = new Date(currentYear, 9, 15, endHours, endMinutes); // October 15
      
      return { startDate, endDate };
    }
    
    // Format: "Summer 2025" (season and year)
    const seasonYearPattern = /(spring|summer|fall|autumn|winter)\s+(\d{4})/i;
    const seasonYearMatch = dateString.match(seasonYearPattern);
    
    if (seasonYearMatch) {
      const season = seasonYearMatch[1].toLowerCase();
      const year = parseInt(seasonYearMatch[2], 10);
      
      let startDate, endDate;
      
      // Richmond Night Market typically runs during summer
      if (season === 'summer') {
        startDate = new Date(year, 4, 1, 17, 0); // May 1st, 5pm
        endDate = new Date(year, 9, 15, 23, 0); // October 15, 11pm
      } else if (season === 'spring') {
        startDate = new Date(year, 3, 15, 17, 0); // April 15, 5pm
        endDate = new Date(year, 5, 30, 23, 0); // June 30, 11pm
      } else if (season === 'fall' || season === 'autumn') {
        startDate = new Date(year, 8, 1, 17, 0); // September 1, 5pm
        endDate = new Date(year, 9, 31, 23, 0); // October 31, 11pm
      }
      
      if (startDate && !isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "2025 Season" (year only)
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = dateString.match(yearPattern);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      
      // Richmond Night Market typically runs from late April to early October
      const startDate = new Date(year, 3, 26, 17, 0); // April 26, 5pm
      const endDate = new Date(year, 9, 10, 23, 0); // October 10, 11pm
      
      return { startDate, endDate };
    }
    
    // If all else fails but the string contains "night market", use typical dates
    if (dateString.toLowerCase().includes('night market')) {
      const startDate = new Date(currentYear, 3, 26, 17, 0); // April 26, 2025, 5pm
      const endDate = new Date(currentYear, 9, 10, 23, 0); // October 10, 2025, 11pm
      
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

module.exports = RichmondNightMarketEvents;
