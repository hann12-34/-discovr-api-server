/**
 * Great Outdoors Comedy Festival Events Scraper
 * Scrapes events from Great Outdoors Comedy Festival Vancouver page
 * https://greatoutdoorscomedyfestival.com/vancouver-britishcolumbia-2025/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class GreatOutdoorsComedyEvents {
  constructor() {
    this.name = 'Great Outdoors Comedy Festival Vancouver';
    this.url = 'https://greatoutdoorscomedyfestival.com/vancouver-britishcolumbia-2025/';
    this.sourceIdentifier = 'great-outdoors-comedy-fest';
    this.venue = {
      name: 'Stanley Park',
      address: 'Stanley Park, Vancouver, BC',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.3017, lng: -123.1417 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'great-outdoors-comedy-fest');
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
   * Scrape events from Great Outdoors Comedy Festival page
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping Great Outdoors Comedy Festival Events...');
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
      console.log('Navigating to Great Outdoors Comedy Festival page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Great Outdoors Comedy Festival page');
      
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
      // Wait for main content to load
      await page.waitForSelector('.main-content', { timeout: 30000 });
      
      // Extract event information
      const eventInfo = await page.evaluate(() => {
        // Look for show dates/times
        const dateElements = Array.from(document.querySelectorAll('.main-content h2, .main-content h3, .main-content strong'))
          .filter(el => {
            const text = el.textContent.toLowerCase();
            return text.includes('2025') || 
                  text.includes('july') || 
                  text.includes('august') || 
                  text.includes('june') || 
                  text.includes('lineup');
          });
          
        // Get festival title
        const title = document.querySelector('h1')?.textContent.trim() || 
                    document.title.replace(' - Great Outdoors Comedy Festival', '').trim();
        
        // Get festival description
        const descriptionParagraphs = Array.from(document.querySelectorAll('.main-content p'))
          .filter(p => p.textContent.trim().length > 20)
          .slice(0, 3);  // Get first few substantive paragraphs for description
          
        const description = descriptionParagraphs
          .map(p => p.textContent.trim())
          .join('\n\n');
        
        // Get main festival image
        const images = Array.from(document.querySelectorAll('.main-content img'));
        const mainImage = images.length > 0 ? images[0].src : '';
        
        // Extract show information
        const shows = [];
        dateElements.forEach(dateEl => {
          const dateText = dateEl.textContent.trim();
          
          // Look for comedian names in the surrounding elements
          let performers = [];
          let currentElement = dateEl.nextElementSibling;
          let dateFound = false;
          
          // Look for date patterns
          const dateMatch = dateText.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i);
          dateFound = dateMatch !== null;
          
          // Process following elements to find performers until next date or heading
          while (currentElement && 
                 !currentElement.tagName.match(/^H[1-6]$/) && 
                 !currentElement.textContent.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?/i)) {
            if (currentElement.tagName === 'P' && currentElement.textContent.trim().length > 0) {
              performers.push(currentElement.textContent.trim());
            }
            currentElement = currentElement.nextElementSibling;
            if (!currentElement) break;
          }
          
          if (dateFound) {
            shows.push({
              dateText,
              performers: performers.join(' • ') || 'TBA'
            });
          }
        });
        
        // Try to find ticket link
        const ticketLinks = Array.from(document.querySelectorAll('a'))
          .filter(a => {
            const href = a.href.toLowerCase();
            const text = a.textContent.toLowerCase();
            return href.includes('ticket') || 
                  href.includes('passes') || 
                  text.includes('ticket') || 
                  text.includes('buy') || 
                  text.includes('passes');
          });
          
        const ticketUrl = ticketLinks.length > 0 ? ticketLinks[0].href : '';
        
        return {
          title,
          description,
          mainImage,
          shows,
          ticketUrl
        };
      });
      
      // Transform extracted data into event objects
      const events = [];
      
      // Process each show as a separate event
      if (eventInfo.shows && eventInfo.shows.length > 0) {
        for (const show of eventInfo.shows) {
          const dates = this._parseDatesFromString(show.dateText);
          
          if (!dates || !dates.startDate) {
            console.log(`⚠️ Could not parse valid date from: "${show.dateText}"`);
            continue;
          }
          
          // Create description by combining festival info with performer info
          const showDescription = `${eventInfo.description}\n\n${show.dateText}\n\nFeaturing: ${show.performers}`;
          
          // Create event object
          const event = {
            title: `${eventInfo.title} - ${show.dateText}`,
            description: showDescription,
            startDate: dates.startDate,
            endDate: dates.endDate || null,
            imageUrl: eventInfo.mainImage,
            url: this.url,
            ticketUrl: eventInfo.ticketUrl || this.url,
            venue: this.venue,
            sourceIdentifier: this.sourceIdentifier,
            uniqueId: `${this.sourceIdentifier}-${slugify(show.dateText, { lower: true, strict: true })}`
          };
          
          events.push(event);
        }
      }
      
      // If no individual shows could be parsed, create a single event for the whole festival
      if (events.length === 0 && eventInfo.title && eventInfo.description) {
        // Try to extract dates from the title or description
        const titleDateMatch = eventInfo.title.match(/\b(20\d{2})\b/);
        const year = titleDateMatch ? parseInt(titleDateMatch[1]) : 2025;
        
        // Estimate dates for the festival (summer events typically in June/July)
        const startDate = new Date(`July 15, ${year}`);
        const endDate = new Date(`July 17, ${year}`);
        
        const festivalEvent = {
          title: eventInfo.title,
          description: eventInfo.description,
          startDate,
          endDate,
          imageUrl: eventInfo.mainImage,
          url: this.url,
          ticketUrl: eventInfo.ticketUrl || this.url,
          venue: this.venue,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-${year}`
        };
        
        events.push(festivalEvent);
      }
      
      return events;
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
    
    // Add default year if not present (assuming 2025 as in the URL)
    let processedDateString = dateString;
    if (!processedDateString.includes('2025')) {
      processedDateString += ' 2025';
    }
    
    // Format: "Saturday, July 5th" or "Saturday, July 5th, 2025"
    const dayMonthPattern = /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?,?\s*(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const dayMonthMatch = processedDateString.match(dayMonthPattern);
    
    if (dayMonthMatch) {
      const month = dayMonthMatch[1];
      const day = parseInt(dayMonthMatch[2], 10);
      const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3], 10) : 2025;
      
      const startDate = new Date(`${month} ${day}, ${year} 19:00:00`); // Assume 7PM for comedy shows
      
      if (!isNaN(startDate.getTime())) {
        // Create end time 3 hours later (typical comedy show duration)
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 3);
        
        return { startDate, endDate };
      }
    }
    
    // Format: "July 5-7, 2025" (festival date range)
    const rangePattern = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?[-–](\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
    const rangeMatch = processedDateString.match(rangePattern);
    
    if (rangeMatch) {
      const month = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endDay = parseInt(rangeMatch[3], 10);
      const year = parseInt(rangeMatch[4], 10);
      
      const startDate = new Date(`${month} ${startDay}, ${year}`);
      const endDate = new Date(`${month} ${endDay}, ${year} 23:59:59`);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "July 2025" (month and year only)
    const monthYearPattern = /(\w+)\s+(\d{4})/i;
    const monthYearMatch = processedDateString.match(monthYearPattern);
    
    if (monthYearMatch) {
      const month = monthYearMatch[1];
      const year = parseInt(monthYearMatch[2], 10);
      
      // Set to middle of the month as an estimate
      const startDate = new Date(`${month} 15, ${year}`);
      const endDate = new Date(`${month} 17, ${year}`);
      
      if (!isNaN(startDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    console.log(`⚠️ Could not parse date from string: "${dateString}"`);
    return null;
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

module.exports = GreatOutdoorsComedyEvents;
