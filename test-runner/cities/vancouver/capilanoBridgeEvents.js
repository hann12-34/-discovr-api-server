/**
 * Capilano Suspension Bridge Park Events Scraper
 * Scrapes events from the Capilano Suspension Bridge Park website
 * https://www.capbridge.com/explore/events/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class CapilanoBridgeEvents {
  constructor() {
    this.name = 'Capilano Suspension Bridge Park Events';
    this.url = 'https://www.capbridge.com/explore/events/';
    this.sourceIdentifier = 'capilano-bridge';
    this.venue = {
      name: 'Capilano Suspension Bridge Park',
      address: '3735 Capilano Road, North Vancouver, BC V7R 4J1',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.3429, lng: -123.1149 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'capilano-bridge');
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
   * Scrape events from Capilano Suspension Bridge Park website
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
      
      // Navigate to the events page
      console.log(`Navigating to ${this.url}...`);
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log(`📄 Navigated to ${this.url}`);
      
      // Extract events
      console.log('Extracting events...');
      const events = await this._extractEvents(page);
      
      // Check for seasonal events on the main page if needed
      if (events.length === 0) {
        console.log('No events found on the events page. Checking the homepage for seasonal events...');
        await page.goto('https://www.capbridge.com/', { waitUntil: 'networkidle0', timeout: 30000 });
        const seasonalEvents = await this._extractSeasonalEvents(page);
        events.push(...seasonalEvents);
      }
      
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
   * Extract events from the events page
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractEvents(page) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      // Extract events using different selectors - Capilano's site may use various layouts
      return await page.evaluate(async () => {
        const events = [];
        
        // Try different selectors for event containers
        const selectors = [
          '.event-item',
          '.event-card',
          '.event-post',
          '.post-event',
          '.event',
          '.programs-events-item',
          '.seasonal-event',
          'article.post',
          '.et_pb_post',
          '.card',
          '[class*="event"]'
        ];
        
        // Try each selector
        for (const selector of selectors) {
          const containers = document.querySelectorAll(selector);
          
          if (containers && containers.length > 0) {
            // Process event containers
            for (const container of containers) {
              // Extract event title
              const titleEl = container.querySelector('h1, h2, h3, h4, h5, .title, .event-title');
              const title = titleEl ? titleEl.textContent.trim() : '';
              
              // Extract event date
              const dateEl = container.querySelector('.date, .event-date, [class*="date"], time');
              const dateText = dateEl ? dateEl.textContent.trim() : '';
              
              // Extract event description
              const descEl = container.querySelector('p, .description, .excerpt, .event-description, [class*="description"]');
              const description = descEl ? descEl.textContent.trim() : '';
              
              // Extract event image
              const imgEl = container.querySelector('img');
              const imageUrl = imgEl ? imgEl.src : '';
              
              // Extract event URL
              const linkEl = container.querySelector('a');
              const url = linkEl ? linkEl.href : '';
              
              // Only add events with at least a title and some date or description info
              if (title && (dateText || description)) {
                events.push({
                  title,
                  dateText,
                  description: description || title,
                  imageUrl,
                  url: url || window.location.href
                });
              }
            }
            
            // If we found events, break out of the loop
            if (events.length > 0) {
              break;
            }
          }
        }
        
        // If no events found with the above selectors, look for text content with potential events
        if (events.length === 0) {
          // Look for headers that might indicate events
          const eventHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
            .filter(h => {
              const text = h.textContent.toLowerCase();
              return text.includes('event') || 
                     text.includes('festival') || 
                     text.includes('celebration') ||
                     text.includes('holiday') ||
                     text.includes('special') ||
                     text.includes('season');
            });
          
          // Process each potential event header
          for (const header of eventHeaders) {
            let eventTitle = header.textContent.trim();
            
            // Find the nearest paragraph for description
            let descElement = header.nextElementSibling;
            let description = '';
            
            // Look for description in the next few elements
            let searchCount = 0;
            while (descElement && searchCount < 3) {
              if (descElement.tagName === 'P' || descElement.tagName === 'DIV') {
                description += ' ' + descElement.textContent.trim();
              }
              descElement = descElement.nextElementSibling;
              searchCount++;
            }
            
            // Extract date from title or description
            const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+)?\d{1,2}(?:st|nd|rd|th)?)?(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/i;
            
            let dateText = '';
            const titleDateMatch = eventTitle.match(datePattern);
            if (titleDateMatch) {
              dateText = titleDateMatch[0];
            } else {
              const descDateMatch = description.match(datePattern);
              if (descDateMatch) {
                dateText = descDateMatch[0];
              }
            }
            
            // Find nearby image
            let imageUrl = '';
            const nearbyImage = header.parentElement.querySelector('img');
            if (nearbyImage) {
              imageUrl = nearbyImage.src;
            }
            
            if (eventTitle && (dateText || description)) {
              events.push({
                title: eventTitle,
                dateText,
                description: description || eventTitle,
                imageUrl,
                url: window.location.href
              });
            }
          }
        }
        
        return events;
      });
    } catch (error) {
      console.error(`Error extracting events: ${error.message}`);
      await this._saveDebugInfo(page, 'extraction-error');
      return [];
    }
  }
  
  /**
   * Extract seasonal events from the homepage or other pages
   * @param {Page} page Puppeteer page object
   * @returns {Promise<Array>} Array of event objects
   */
  async _extractSeasonalEvents(page) {
    try {
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 30000 });
      
      return await page.evaluate(() => {
        const events = [];
        
        // Look for seasonal event keywords in headings and prominent text
        const seasonalKeywords = [
          'Canyon Lights',
          'Christmas',
          'Halloween',
          'Summer',
          'Spring',
          'Holiday',
          'Festival',
          'Special Event',
          'Celebration',
          'Limited Time'
        ];
        
        // Find elements containing seasonal keywords
        for (const keyword of seasonalKeywords) {
          const xpathResult = document.evaluate(
            `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${keyword.toLowerCase()}')]`,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          
          for (let i = 0; i < xpathResult.snapshotLength; i++) {
            const element = xpathResult.snapshotItem(i);
            
            // Check if this is a heading or prominent text
            const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName);
            const isProminent = element.tagName === 'STRONG' || 
                                element.tagName === 'B' || 
                                element.classList.contains('title') || 
                                element.style.fontSize && parseInt(element.style.fontSize) > 16;
            
            if (isHeading || isProminent) {
              const title = element.textContent.trim();
              
              // Look for date information in siblings or parent container
              let dateText = '';
              let description = '';
              
              // Check siblings for date and description
              let sibling = element.nextElementSibling;
              let siblingCount = 0;
              
              while (sibling && siblingCount < 4) {
                const siblingText = sibling.textContent.trim();
                
                // Look for date patterns
                const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+)?\d{1,2}(?:st|nd|rd|th)?)?(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/i;
                const dateMatch = siblingText.match(datePattern);
                
                if (dateMatch && !dateText) {
                  dateText = dateMatch[0];
                }
                
                // Accumulate description from paragraphs
                if (sibling.tagName === 'P' && siblingText.length > 20) {
                  description += ' ' + siblingText;
                }
                
                sibling = sibling.nextElementSibling;
                siblingCount++;
              }
              
              // If we didn't find a description in the siblings, look at parent container
              if (!description && element.parentElement) {
                description = element.parentElement.textContent.trim().replace(title, '').trim();
              }
              
              // Limit description length
              if (description.length > 500) {
                description = description.substring(0, 500) + '...';
              }
              
              // Look for images
              let imageUrl = '';
              const nearbyImage = element.parentElement.querySelector('img');
              if (nearbyImage) {
                imageUrl = nearbyImage.src;
              }
              
              // Find a URL if there's a link
              let url = window.location.href;
              const nearbyLink = element.parentElement.querySelector('a[href*="event"]');
              if (nearbyLink) {
                url = nearbyLink.href;
              }
              
              // Only add if we have a title and at least some date or description info
              if (title && (dateText || description)) {
                events.push({
                  title,
                  dateText,
                  description: description || title,
                  imageUrl,
                  url
                });
              }
            }
          }
        }
        
        return events;
      });
    } catch (error) {
      console.error(`Error extracting seasonal events: ${error.message}`);
      await this._saveDebugInfo(page, 'seasonal-extraction-error');
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
    
    // Format: "May 15 - September 2, 2025" (season range)
    const seasonRangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[–\-]\s*)(?:(\w+)\s+)?(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const seasonRangeMatch = dateString.match(seasonRangePattern);
    
    if (seasonRangeMatch) {
      const startMonth = seasonRangeMatch[1];
      const startDay = parseInt(seasonRangeMatch[2], 10);
      const endMonth = seasonRangeMatch[3] || startMonth;
      const endDay = parseInt(seasonRangeMatch[4], 10);
      const year = seasonRangeMatch[5] ? parseInt(seasonRangeMatch[5], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(startMonth), startDay, 9, 0); // Typically opens at 9am
      const endDate = new Date(year, this._getMonthNumber(endMonth), endDay, 21, 0); // Closes at 9pm
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "December 2025 - January 2026" (multi-year range)
    const multiYearPattern = /(\w+)\s+(\d{4})(?:\s*[–\-]\s*)(\w+)\s+(\d{4})/i;
    const multiYearMatch = dateString.match(multiYearPattern);
    
    if (multiYearMatch) {
      const startMonth = multiYearMatch[1];
      const startYear = parseInt(multiYearMatch[2], 10);
      const endMonth = multiYearMatch[3];
      const endYear = parseInt(multiYearMatch[4], 10);
      
      const startDate = new Date(startYear, this._getMonthNumber(startMonth), 1, 9, 0);
      const endDate = new Date(endYear, this._getMonthNumber(endMonth) + 1, 0, 21, 0); // Last day of the month
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "May 15, 2025" (single date)
    const singleDatePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const singleDateMatch = dateString.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = singleDateMatch[3] ? parseInt(singleDateMatch[3], 10) : currentYear;
      
      const startDate = new Date(year, this._getMonthNumber(month), day, 9, 0);
      const endDate = new Date(year, this._getMonthNumber(month), day, 21, 0);
      
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
      
      const startDate = new Date(year, month, day, 9, 0);
      const endDate = new Date(year, month, day, 21, 0);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Try to extract year and season terms for general seasonal events
    const yearPattern = /\b(20\d{2})\b/;
    const yearMatch = dateString.match(yearPattern);
    
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      
      // Check for seasonal terms
      if (/christmas|holiday|winter|december|canyon lights/i.test(dateString)) {
        // Winter holiday event - typically late November to early January
        const startDate = new Date(year, 10, 25); // Nov 25th
        const endDate = new Date(year + 1, 0, 5); // Jan 5th next year
        return { startDate, endDate };
      }
      
      if (/summer|june|july|august/i.test(dateString)) {
        // Summer event - typically June to August
        const startDate = new Date(year, 5, 15); // June 15th
        const endDate = new Date(year, 8, 5); // September 5th
        return { startDate, endDate };
      }
      
      if (/spring|april|may/i.test(dateString)) {
        // Spring event - typically April to May
        const startDate = new Date(year, 3, 1); // April 1st
        const endDate = new Date(year, 5, 15); // June 15th
        return { startDate, endDate };
      }
      
      if (/autumn|fall|september|october/i.test(dateString)) {
        // Fall event - typically September to October
        const startDate = new Date(year, 8, 15); // September 15th
        const endDate = new Date(year, 10, 15); // November 15th
        return { startDate, endDate };
      }
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

module.exports = CapilanoBridgeEvents;
