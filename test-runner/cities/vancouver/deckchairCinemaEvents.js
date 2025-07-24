/**
 * The Polygon Deckchair Cinema Events Scraper
 * Scrapes events from The Polygon's Deckchair Cinema 2025 Summer of Sci-Fi page
 * https://thepolygon.ca/news/deckchair-cinema-2025-summer-of-sci-fi-lineup/
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

class DeckchairCinemaEvents {
  constructor() {
    this.name = 'The Polygon Deckchair Cinema Events';
    this.url = 'https://thepolygon.ca/news/deckchair-cinema-2025-summer-of-sci-fi-lineup/';
    this.sourceIdentifier = 'polygon-deckchair-cinema';
    this.venue = {
      name: 'The Polygon Gallery',
      address: '101 Carrie Cates Court, North Vancouver, BC V7M 3J4',
      city: 'North Vancouver',
      province: 'BC',
      country: 'Canada',
      coordinates: { lat: 49.3088, lng: -123.0826 }
    };
    this.debugDir = path.join(process.cwd(), 'debug', 'polygon-deckchair-cinema');
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
   * Scrape events from The Polygon Deckchair Cinema page
   * @returns {Promise<Array>} Array of event objects
   */
  async scrape() {
    console.log('Scraping The Polygon Deckchair Cinema Events...');
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
      console.log('Navigating to Deckchair Cinema page...');
      await page.goto(this.url, { waitUntil: 'networkidle0', timeout: 60000 });
      console.log('📄 Navigated to Deckchair Cinema page');
      
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
      await page.waitForSelector('.content-wrap', { timeout: 30000 });
      
      // Extract main cinema series information
      const mainEventInfo = await page.evaluate(() => {
        // Get the main title (Deckchair Cinema series)
        const title = document.querySelector('h1')?.innerText.trim() || '';
        
        // Get the main description
        const descriptionElements = Array.from(document.querySelectorAll('.content-wrap > p'));
        const seriesDescription = descriptionElements
          .slice(0, 3) // Usually first few paragraphs describe the series
          .map(p => p.innerText.trim())
          .filter(text => text.length > 0)
          .join('\n\n');
        
        // Get the series period
        const dateText = document.querySelector('.content-wrap')?.innerText.match(/(?:July|August)\s+\d{1,2}\s*(?:–|-|to)\s*(?:July|August)\s+\d{1,2},?\s*\d{4}/i)?.[0] || '';
        
        // Get the banner image if available
        const imageUrl = document.querySelector('.wp-post-image')?.src || '';
        
        return {
          title,
          seriesDescription,
          dateText,
          imageUrl
        };
      });
      
      // Extract individual film events
      const filmEvents = await page.evaluate((venueInfo) => {
        // Look for film blocks
        const filmBlocks = Array.from(document.querySelectorAll('.content-wrap h3, .content-wrap h4, .content-wrap strong'))
          .filter(el => {
            // Filter for headings that likely contain film titles and dates
            const text = el.innerText.trim();
            return text.includes('2025') || // Contains year
                  /(?:July|August)\s+\d{1,2}/.test(text) || // Contains month + day
                  /\d{1,2}\s+(?:July|August)/.test(text); // Contains day + month
          });
        
        const films = [];
        
        // Process each film block
        filmBlocks.forEach(filmBlock => {
          const titleDateText = filmBlock.innerText.trim();
          
          // Parse out the film title and date
          const filmTitleMatch = titleDateText.match(/^(.*?)(?:–|-|,|\(|\d{1,2}\s+(?:July|August)|(?:July|August)\s+\d{1,2})/i);
          let filmTitle = filmTitleMatch ? filmTitleMatch[1].trim() : titleDateText;
          
          // Clean up title (remove year if present)
          filmTitle = filmTitle.replace(/\(\d{4}\)/, '').trim();
          
          // Extract date
          const dateMatch = titleDateText.match(/(?:July|August)\s+\d{1,2},?\s*\d{4}|(?:July|August)\s+\d{1,2}|\d{1,2}\s+(?:July|August)/i);
          const dateText = dateMatch ? dateMatch[0] : '';
          
          // Find the description - usually the paragraph following the heading
          let filmDescription = '';
          let descNode = filmBlock.nextElementSibling;
          while (descNode && descNode.tagName !== 'H3' && descNode.tagName !== 'H4') {
            if (descNode.tagName === 'P') {
              filmDescription += descNode.innerText.trim() + '\n\n';
            }
            descNode = descNode.nextElementSibling;
          }
          
          // Only add valid films with both title and date
          if (filmTitle && dateText) {
            films.push({
              title: filmTitle,
              description: filmDescription.trim(),
              dateText: dateText,
              location: 'Deckchair Cinema at The Polygon Gallery',
              venue: venueInfo
            });
          }
        });
        
        return films;
      }, this.venue);
      
      // Process extracted data into event objects
      const events = [];
      
      // Process individual film events
      for (const film of filmEvents) {
        const dates = this._parseDatesFromString(film.dateText);
        
        if (!dates || !dates.startDate) {
          console.log(`⚠️ Could not parse valid dates for film: "${film.title}" from: "${film.dateText}"`);
          continue;
        }
        
        // Create event object for this film
        const filmEvent = {
          title: `Deckchair Cinema: ${film.title}`,
          description: film.description || `${mainEventInfo.seriesDescription}\n\nFeaturing "${film.title}" as part of the 2025 Summer of Sci-Fi lineup at The Polygon Gallery's Deckchair Cinema series.`,
          startDate: dates.startDate,
          endDate: dates.endDate || null,
          imageUrl: mainEventInfo.imageUrl,
          url: this.url,
          venue: this.venue,
          sourceIdentifier: this.sourceIdentifier,
          uniqueId: `${this.sourceIdentifier}-${slugify(film.title, { lower: true, strict: true })}-${dates.startDate.toISOString().split('T')[0]}`
        };
        
        events.push(filmEvent);
      }
      
      // If no individual film events could be parsed, create a single event for the entire series
      if (events.length === 0 && mainEventInfo.title && mainEventInfo.dateText) {
        const seriesDates = this._parseDatesFromString(mainEventInfo.dateText);
        
        if (seriesDates && seriesDates.startDate) {
          const seriesEvent = {
            title: mainEventInfo.title,
            description: mainEventInfo.seriesDescription,
            startDate: seriesDates.startDate,
            endDate: seriesDates.endDate || null,
            imageUrl: mainEventInfo.imageUrl,
            url: this.url,
            venue: this.venue,
            sourceIdentifier: this.sourceIdentifier,
            uniqueId: `${this.sourceIdentifier}-series-${seriesDates.startDate.getFullYear()}`
          };
          
          events.push(seriesEvent);
        }
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
    
    // Add default year if not present (assuming 2025 as mentioned in the URL)
    let processedDateString = dateString;
    if (!processedDateString.includes('2025')) {
      processedDateString += ', 2025';
    }
    
    // Format: "July 10, 2025"
    const singleDatePattern = /(\w+)\s+(\d{1,2})(?:,|)\s*(\d{4})/i;
    const singleDateMatch = processedDateString.match(singleDatePattern);
    
    if (singleDateMatch) {
      const month = singleDateMatch[1];
      const day = parseInt(singleDateMatch[2], 10);
      const year = parseInt(singleDateMatch[3], 10);
      
      const startDate = new Date(`${month} ${day}, ${year} 19:30:00`); // Assume 7:30PM for films
      
      if (!isNaN(startDate.getTime())) {
        // Create end time 2.5 hours later (typical film duration with event)
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2, endDate.getMinutes() + 30);
        
        return { startDate, endDate };
      }
    }
    
    // Format: "July 10 – August 28, 2025" (series date range)
    const rangePattern = /(\w+)\s+(\d{1,2})\s*(?:–|-|to|until)\s*(\w+)\s+(\d{1,2}),?\s*(\d{4})/i;
    const rangeMatch = processedDateString.match(rangePattern);
    
    if (rangeMatch) {
      const startMonth = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2], 10);
      const endMonth = rangeMatch[3];
      const endDay = parseInt(rangeMatch[4], 10);
      const year = parseInt(rangeMatch[5], 10);
      
      const startDate = new Date(`${startMonth} ${startDay}, ${year}`);
      const endDate = new Date(`${endMonth} ${endDay}, ${year}`);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        return { startDate, endDate };
      }
    }
    
    // Format: "10 July" (day first)
    const dayFirstPattern = /(\d{1,2})\s+(\w+)/i;
    const dayFirstMatch = processedDateString.match(dayFirstPattern);
    
    if (dayFirstMatch) {
      const day = parseInt(dayFirstMatch[1], 10);
      const month = dayFirstMatch[2];
      
      // Assume current year or 2025 (from URL)
      const year = 2025;
      
      const startDate = new Date(`${month} ${day}, ${year} 19:30:00`); // Assume 7:30PM for films
      
      if (!isNaN(startDate.getTime())) {
        // Create end time 2.5 hours later (typical film duration with event)
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 2, endDate.getMinutes() + 30);
        
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
      
      console.log(`📝 Debug info saved to ${sessionDir}`);
    } catch (error) {
      console.error(`Failed to save debug info: ${error.message}`);
    }
  }
}

module.exports = DeckchairCinemaEvents;
