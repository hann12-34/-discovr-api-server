/**
 * Vancouver Public Library Events Scraper
 * Scrapes events from Vancouver Public Library
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { v4: uuidv4, v5: uuidv5 } = require('uuid');
const axios = require('axios');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// List of user agents for anti-bot detection
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
];

// Use stealth plugin to prevent detection
puppeteer.use(StealthPlugin());

/**
 * Vancouver Public Library Events Scraper
 */
const PublicLibraryEvents = {
  name: 'Vancouver Public Library',
  url: 'https://www.vpl.ca/events',
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
      
      // Check for date range with "to" or "-" or "–"
      if (dateString.includes(' to ') || dateString.includes(' - ') || dateString.includes(' – ')) {
        let parts;
        if (dateString.includes(' to ')) {
          parts = dateString.split(' to ');
        } else if (dateString.includes(' - ')) {
          parts = dateString.split(' - ');
        } else {
          parts = dateString.split(' – ');
        }
        
        const startDateStr = parts[0].trim();
        const endDateStr = parts[1].trim();
        
        // Parse start and end dates individually
        const startDateInfo = this._parseSingleDate(startDateStr);
        const endDateInfo = this._parseSingleDate(endDateStr);
        
        if (startDateInfo && endDateInfo) {
          // If both start and end dates are valid
          return { 
            startDate: startDateInfo.date,
            endDate: endDateInfo.date
          };
        }
      }
      
      // Try to parse as a single date
      const dateInfo = this._parseSingleDate(dateString);
      if (dateInfo) {
        // For library events, end time is typically 1.5 hours after start
        const endDate = new Date(dateInfo.date);
        
        // If event time is specified, add 1.5 hours for end time
        if (dateInfo.hasTimeInfo) {
          endDate.setMinutes(endDate.getMinutes() + 90);
        } 
        // Otherwise, set end date to end of day
        else {
          endDate.setHours(23, 59, 59);
        }
        
        return { 
          startDate: dateInfo.date,
          endDate
        };
      }
      
      console.log(`Could not parse date: ${dateString}`);
      return { startDate: null, endDate: null };
      
    } catch (error) {
      console.error(`Error parsing date "${dateString}": ${error.message}`);
      return { startDate: null, endDate: null };
    }
  },
  
  /**
   * Parse a single date string
   * @param {string} dateString - The date string to parse
   * @returns {Object|null} - Object with parsed date and hasTimeInfo flag, or null if parsing fails
   */
  _parseSingleDate(dateString) {
    if (!dateString) return null;
    
    dateString = dateString.trim();
    let hasTimeInfo = false;
    
    // Handle time-only format like "5:00pm" (assumes today's date)
    const timeOnlyPattern = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)$/i;
    const timeOnlyMatch = dateString.match(timeOnlyPattern);
    
    if (timeOnlyMatch) {
      const hours = parseInt(timeOnlyMatch[1]);
      const minutes = timeOnlyMatch[2] ? parseInt(timeOnlyMatch[2]) : 0;
      const isPM = timeOnlyMatch[3].toLowerCase() === 'pm';
      
      const today = new Date();
      let eventHours = hours;
      
      // Convert to 24-hour format
      if (isPM && eventHours < 12) eventHours += 12;
      if (!isPM && eventHours === 12) eventHours = 0;
      
      const date = new Date(
        today.getFullYear(), 
        today.getMonth(), 
        today.getDate(),
        eventHours,
        minutes,
        0
      );
      
      return { date, hasTimeInfo: true };
    }
    
    // VPL specific format: "Tuesday, July 7, 2025 - 2:00pm to 3:30pm"
    const vplFormatPattern = /([\w]+), ([\w]+) (\d{1,2}), (\d{4})(?:.+?(\d{1,2}):(\d{2})(?:am|pm))?/i;
    const vplFormatMatch = dateString.match(vplFormatPattern);
    
    if (vplFormatMatch) {
      const day = vplFormatMatch[1]; // e.g., Tuesday
      const month = vplFormatMatch[2]; // e.g., July
      const dayNum = parseInt(vplFormatMatch[3]); // e.g., 7
      const year = parseInt(vplFormatMatch[4]); // e.g., 2025
      
      const months = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11
      };
      
      const monthNum = months[month.toLowerCase()];
      
      if (monthNum !== undefined) {
        // Check for time information
        let hours = 12; // Default to noon for library events
        let minutes = 0;
        
        // If specific time info is in the match
        if (vplFormatMatch[5]) {
          hasTimeInfo = true;
          hours = parseInt(vplFormatMatch[5]);
          minutes = parseInt(vplFormatMatch[6]);
          
          // Check if PM based on original string
          const isPM = dateString.toLowerCase().includes(hours + ':' + vplFormatMatch[6] + 'pm');
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        } else {
          // Look for time elsewhere in the string
          const timePattern = /(\d{1,2}):(\d{2})(am|pm)/i;
          const timeMatch = dateString.match(timePattern);
          
          if (timeMatch) {
            hasTimeInfo = true;
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2]);
            
            // Convert to 24-hour format
            const isPM = timeMatch[3].toLowerCase() === 'pm';
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          }
        }
        
        const date = new Date(year, monthNum, dayNum, hours, minutes, 0);
        return { date, hasTimeInfo };
      }
    }
    
    // Format: "July 7, 2025" or "July 7 2025"
    const monthDayYearPattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i;
    const monthDayYearMatch = dateString.match(monthDayYearPattern);
    
    if (monthDayYearMatch) {
      const month = monthDayYearMatch[1];
      const day = parseInt(monthDayYearMatch[2]);
      // Default to current year if not specified
      const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3]) : new Date().getFullYear();
      
      const months = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
        november: 10, nov: 10, december: 11, dec: 11
      };
      
      const monthNum = months[month.toLowerCase()];
      
      if (monthNum !== undefined) {
        // Check for time information
        const timePattern = /(\d{1,2}):(\d{2})(am|pm)/i;
        const timeMatch = dateString.match(timePattern);
        
        let hours = 12; // Default to noon for library events
        let minutes = 0;
        
        if (timeMatch) {
          hasTimeInfo = true;
          hours = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
          
          // Convert to 24-hour format
          const isPM = timeMatch[3].toLowerCase() === 'pm';
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
        }
        
        const date = new Date(year, monthNum, day, hours, minutes, 0);
        return { date, hasTimeInfo };
      }
    }
    
    // Format: "7/7/2025" or "7-7-2025"
    const numericDatePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const numericDateMatch = dateString.match(numericDatePattern);
    
    if (numericDateMatch) {
      let month = parseInt(numericDateMatch[1]) - 1; // 0-indexed month
      const day = parseInt(numericDateMatch[2]);
      let year = parseInt(numericDateMatch[3]);
      
      // Fix 2-digit year
      if (year < 100) {
        year += 2000; // Assuming all dates are in the 21st century
      }
      
      // Check for time information
      const timePattern = /(\d{1,2}):(\d{2})(am|pm)/i;
      const timeMatch = dateString.match(timePattern);
      
      let hours = 12; // Default to noon for library events
      let minutes = 0;
      
      if (timeMatch) {
        hasTimeInfo = true;
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }
      
      const date = new Date(year, month, day, hours, minutes, 0);
      return { date, hasTimeInfo };
    }
    
    // Handle loose time patterns like "1pm" or "1 pm"
    const looseTimePattern = /^(\d{1,2})\s*(am|pm|AM|PM)$/i;
    const looseTimeMatch = dateString.match(looseTimePattern);
    
    if (looseTimeMatch) {
      const hours = parseInt(looseTimeMatch[1]);
      const isPM = looseTimeMatch[2].toLowerCase() === 'pm';
      
      const today = new Date();
      let eventHours = hours;
      
      // Convert to 24-hour format
      if (isPM && eventHours < 12) eventHours += 12;
      if (!isPM && eventHours === 12) eventHours = 0;
      
      const date = new Date(
        today.getFullYear(), 
        today.getMonth(), 
        today.getDate(),
        eventHours,
        0, // 0 minutes
        0
      );
      
      return { date, hasTimeInfo: true };
    }
    
    // Try standard date parsing as a fallback
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) {
      // Check if the original string contained time info
      hasTimeInfo = dateString.match(/\d{1,2}:\d{2}/) !== null || 
                    dateString.match(/\d{1,2}\s*(am|pm)/i) !== null;
      
      // Default to noon for library events if time not specified
      if (!hasTimeInfo) {
        parsedDate.setHours(12, 0, 0);
      }
      
      return { date: parsedDate, hasTimeInfo };
    }
    
    return null;
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
    
    return `vpl-${slug}-${dateStr}`;
  },
  
  /**
   * Extract library branch from event location text
   * @param {string} locationText - Location text from event
   * @returns {string} - Branch name or empty string
   */
  extractBranchName(locationText) {
    if (!locationText) return '';
    
    // Common VPL branch names
    const branches = [
      'Central Library',
      'Britannia',
      'Carnegie',
      'Champlain Heights',
      'Collingwood',
      'Dunbar',
      'Firehall',
      'Fraserview',
      'Hastings',
      'Joe Fortes',
      'Kensington',
      'Kerrisdale',
      'Kitsilano',
      'Marpole',
      'Mount Pleasant',
      'nə́c̓aʔmat ct',
      'Oakridge',
      'Renfrew',
      'South Hill',
      'Terry Salman',
      'West Point Grey'
    ];
    
    for (const branch of branches) {
      if (locationText.includes(branch)) {
        return branch;
      }
    }
    
    return '';
  },
  
  /**
   * Create an event object with all required fields
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl, branchName) {
    // Determine categories based on event title and description
    let categories = ['education', 'community'];
    
    const categoryKeywords = {
      'kids': ['kids', 'children', 'family', 'young', 'teen', 'youth', 'storytime'],
      'books': ['book', 'reading', 'author', 'literature', 'novel', 'poetry'],
      'workshop': ['workshop', 'hands-on', 'interactive', 'learn', 'class'],
      'technology': ['tech', 'digital', 'computer', 'internet', 'coding'],
      'seniors': ['senior', 'older adult', 'elder'],
      'arts-and-culture': ['art', 'culture', 'craft', 'exhibition', 'display'],
      'language': ['language', 'esl', 'english', 'literacy', 'conversation'],
      'health': ['health', 'wellness', 'mental health', 'fitness']
    };
    
    const fullText = (title + ' ' + description).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          categories.push(category);
          break;
        }
      }
    }
    
    // Create venue object, use branch info if available
    const venue = {
      name: 'Vancouver Public Library',
      address: '350 W Georgia St',
      city: 'Vancouver',
      province: 'BC',
      country: 'Canada',
      postalCode: 'V6B 6B1',
      website: 'https://www.vpl.ca/',
      googleMapsUrl: 'https://goo.gl/maps/ShwQjyMzYd2vBUsR8'
    };
    
    // Modify venue for specific branches
    if (branchName) {
      venue.name = `Vancouver Public Library - ${branchName}`;
      
      // Update address based on branch (for common branches)
      if (branchName === 'Central Library') {
        venue.address = '350 W Georgia St';
        venue.postalCode = 'V6B 6B1';
        venue.googleMapsUrl = 'https://goo.gl/maps/ShwQjyMzYd2vBUsR8';
      } else if (branchName === 'Kitsilano') {
        venue.address = '2425 Macdonald St';
        venue.postalCode = 'V6K 3Y9';
        venue.googleMapsUrl = 'https://goo.gl/maps/ZLMZSzogGMrVX4BS6';
      } else if (branchName === 'Mount Pleasant') {
        venue.address = '1 Kingsway';
        venue.postalCode = 'V5T 3H7';
        venue.googleMapsUrl = 'https://goo.gl/maps/6usFBArb5cAAzT9Z9';
      }
      // Add more branches as needed
    }
    
    return {
      id,
      title,
      description: description || '',
      startDate,
      endDate,
      imageUrl: imageUrl || '',
      sourceUrl: sourceUrl || this.url,
      venue,
      categories: [...new Set(categories)], // Remove duplicates
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'vancouver-public-library'
    };
  },
  
  /**
   * Extract clean text from HTML content
   * @param {string} htmlContent - HTML content to clean
   * @returns {string} - Cleaned text
   */
  cleanHtmlContent(htmlContent) {
    if (!htmlContent) return '';
    
    // Remove HTML tags
    let text = htmlContent.replace(/<[^>]*>/g, ' ');
    
    // Replace multiple spaces, newlines with single space
    text = text.replace(/\s+/g, ' ');
    
    // Decode HTML entities
    text = text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#039;/g, "'");
    
    return text.trim();
  },
  
  /**
   * Simulate human-like scrolling behavior
   * @param {Object} page - Puppeteer page object
   * @returns {Promise<void>}
   */
  async _simulateScrolling(page) {
    try {
      // Get page height
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      
      // For testing, use a more efficient scrolling pattern
      // Just do a few quick scrolls to trigger any lazy loading
      const scrollPoints = [0.3, 0.6, 0.9]; // Scroll to 30%, 60%, and 90% of page
      
      for (const point of scrollPoints) {
        const scrollPosition = Math.floor(pageHeight * point);
        await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
        
        // Brief pause to allow content to load
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      
    } catch (error) {
      console.log('Error during scroll simulation:', error.message);
      // Continue execution even if scrolling fails
    }
  },
  
  /**
   * Extract event data from a single event card
   * @param {ElementHandle} card - Puppeteer element handle for the event card
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Object|null>} - Event object or null if extraction failed
   */
  async _extractEventFromCard(card, page) {
    try {
      // Get the title
      const titleElement = await card.$('.views-field-title a');
      if (!titleElement) {
        return null;
      }

      // Extract title and URL
      const title = await page.evaluate(el => el.textContent.trim(), titleElement);
      const relativeUrl = await page.evaluate(el => el.getAttribute('href'), titleElement);
      const sourceUrl = `https://www.vpl.ca${relativeUrl}`;

      // Extract date information
      const dateElement = await card.$('.views-field-field-event-date');
      let dateText = '';
      if (dateElement) {
        dateText = await page.evaluate(el => el.textContent.trim(), dateElement);
      }

      // Parse the date range
      const { startDate, endDate } = this.parseDateRange(dateText);
      if (!startDate) {
        console.log(`Could not parse date for event: ${title}`);
        return null;
      }

      // Extract location/branch information
      const locationElement = await card.$('.views-field-field-location');
      let locationText = '';
      if (locationElement) {
        locationText = await page.evaluate(el => el.textContent.trim(), locationElement);
      }

      // Extract branch name
      const branchName = this.extractBranchName(locationText);

      // Extract the description
      const descElement = await card.$('.views-field-body');
      let description = '';
      if (descElement) {
        description = await page.evaluate(el => el.textContent.trim(), descElement);
      }

      // Generate a unique ID for this event
      const id = this.generateEventId(title, startDate);

      // Get image URL if available
      let imageUrl = '';
      const imageElement = await card.$('.views-field-field-image img');
      if (imageElement) {
        const relativeImageUrl = await page.evaluate(el => el.getAttribute('src'), imageElement);
        if (relativeImageUrl) {
          // Handle both relative and absolute URLs
          imageUrl = relativeImageUrl.startsWith('http') ? 
            relativeImageUrl : 
            `https://www.vpl.ca${relativeImageUrl}`;
        }
      }

      // Create and return the event object
      return this.createEventObject(
        id,
        title,
        description,
        startDate,
        endDate,
        imageUrl,
        sourceUrl,
        branchName
      );
    } catch (error) {
      console.error(`Error extracting event data: ${error.message}`);
      return null;
    }
  },

  /**
   * Save debugging information
   * @param {Page} page - Puppeteer page object
   * @param {string} prefix - Prefix for debug files
   */
  async _saveDebugInfo(page, prefix) {
    try {
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
      const debugDir = path.join(__dirname, 'debug');
      
      // Create debug directory if it doesn't exist
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save screenshot
      const screenshotPath = path.join(debugDir, `${prefix}_${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Save HTML content
      const htmlContent = await page.content();
      const htmlPath = path.join(debugDir, `${prefix}_${timestamp}.html`);
      fs.writeFileSync(htmlPath, htmlContent);
      
      console.log(`Debug artifacts saved to ${debugDir}`);
    } catch (error) {
      console.error(`Error saving debug info: ${error.message}`);
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
    
    let events = [];
    let browser = null;
    let eventsData = [];

    // Select a random user agent
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    console.log(`Using User-Agent: ${userAgent.substring(0, 50)}...`);
    
    try {
      // Instead of preflight check with axios (which can still get blocked),
      // we'll go straight to Puppeteer with full stealth techniques
      
      // Launch browser with enhanced stealth settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--ignore-certificate-errors',
          '--window-size=1920,1080',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas'
        ]
      });

      const page = await browser.newPage();

      // Set a realistic viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Set the user agent
      await page.setUserAgent(userAgent);

      // Add stealth plugin to further reduce detection
      await stealth(page);

      // Intercept requests to block unnecessary resources and add realistic headers
      await page.setRequestInterception(true);
      page.on('request', request => {
        const blockedResourceTypes = ['image', 'media', 'font', 'other'];
        const skippedResources = ['google-analytics', 'googleads', 'doubleclick', 'facebook', 'analytics', 'tracker', 'pixel.gif'];
        const url = request.url().toLowerCase();
        if (blockedResourceTypes.includes(request.resourceType()) || skippedResources.some(res => url.includes(res))) {
          request.abort();
        } else {
          const headers = { ...request.headers(), 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8', 'Referer': 'https://www.google.com/', 'Accept-Language': 'en-US,en;q=0.9', 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'DNT': '1' };
          request.continue({ headers });
        }
      });

      // Add JS evasion methods
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      // First try direct navigation
      console.log(`🔍 Scraping events from ${this.name}...`);

      try {
        await page.goto(this.url, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });
        
        // Wait for cookie consent if it appears and accept it
        try {
          await Promise.race([
            page.waitForSelector('button#onetrust-accept-btn-handler', { timeout: 10000 }),
            page.waitForSelector('button[aria-label="Accept All Cookies"]', { timeout: 10000 })
          ]);
          
          try {
            await page.click('button#onetrust-accept-btn-handler');
          } catch (e) {
            await page.click('button[aria-label="Accept All Cookies"]');
          }
          
          await page.waitForTimeout(1500);
        } catch (cookieError) {
          console.log('No cookie consent prompt detected or unable to click it');
        }
      } catch (navigationError) {
        console.log(`First navigation attempt failed: ${navigationError.message}`);
        
        // If direct navigation fails, try with a different approach
        try {
          await page.goto('https://www.vpl.ca/', { waitUntil: 'networkidle2', timeout: 30000 });
          await page.waitForTimeout(3000);
          await page.goto(this.url, { waitUntil: 'networkidle2', timeout: 60000 });
        } catch (directNavError) {
          throw new Error(`Failed to navigate to ${this.url}: ${directNavError.message}`);
        }
      }
      
      // Wait for events to load
      await page.waitForSelector('#events-listing > div', { timeout: 60000 });
      
      // Simulate scrolling to load all events
      try {
        await this._simulateScrolling(page);
      } catch (error) {
        console.log('Error during scroll simulation:', error.message);
      }

      // Wait a bit for any dynamic content to stabilize
      await page.waitForTimeout(3000);
      
      // Save debug info before attempting to extract events
      await this._saveDebugInfo(page, 'pre-extraction');

      console.log('Extracting event cards from the page...');
      try {
        // Wait for the event cards to be present in the DOM
        await page.waitForSelector('.event-teaser, .views-row, article.node--type-event', { timeout: 10000 });

        // Get all event cards
        const eventCards = await page.$$('.event-teaser, .views-row, article.node--type-event');
        console.log(`Found ${eventCards.length} event cards on the page`);         

        if (eventCards.length === 0) {
          console.warn('No event cards found, checking for alternative selectors');
          
          // Try additional selectors if the primary ones didn't work
          const alternativeCards = await page.$$('.card, .program-card, div[class*="event"], div[class*="program"]');
          if (alternativeCards.length > 0) {
            console.log(`Found ${alternativeCards.length} cards with alternative selectors`);
            
            // Process each alternative card
            for (const card of alternativeCards) {
              const event = await this._extractEventFromCard(card, page);
              if (event) {
                events.push(event);
              }
            }
          } else {
            // Take a screenshot and save HTML for debugging
            await this._saveDebugInfo(page, 'no-events-found');
            console.error('No events found on the page with any selector');
          }
        } else {
          // Process each event card found with primary selectors
          for (const card of eventCards) {
            const event = await this._extractEventFromCard(card, page);
            if (event) {
              events.push(event);
            }
          }
        }

        console.log(`Successfully extracted ${events.length} events`);
      } catch (extractionError) {
        console.error(`Error extracting events: ${extractionError.message}`);
        await this._saveDebugInfo(page, 'extraction-error');
      }
      
      // Log the final count of events
      console.log(`Found ${events.length} events from ${this.name}`);
      
      // Save final debug information
      await this._saveDebugInfo(page, 'final-extraction');
      
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

module.exports = PublicLibraryEvents;
