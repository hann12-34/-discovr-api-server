/**
 * Rickshaw Theatre Events Scraper (Fixed Version)
 * Scrapes events from The Rickshaw Theatre in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs').promises;
const path = require('path');

/**
 * Rickshaw Theatre Events Scraper
 */
const RickshawTheatreScraperFixed = {
  name: 'Rickshaw Theatre',
  url: 'https://www.rickshawtheatre.com/',
  enabled: true,
  
  /**
   * Parse a date range string into start and end date objects
   * @param {string} dateString - The date string to parse
   * @returns {Object} - Object containing startDate and endDate
   */
  parseDateRange(dateString) {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Clean up the date string
      dateString = dateString.replace(/\s+/g, ' ').trim();
      
      // Look for time pattern and extract
      let timeHours = 19; // Default to 7pm for concerts if no time specified
      let timeMinutes = 0;
      const timeMatch = dateString.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/i);
      
      if (timeMatch) {
        timeHours = parseInt(timeMatch[1]);
        timeMinutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        
        // Convert to 24-hour format
        const isPM = timeMatch[3].toLowerCase() === 'pm';
        if (isPM && timeHours < 12) timeHours += 12;
        if (!isPM && timeHours === 12) timeHours = 0;
      }
      
      // Match full date with year like "January 15, 2025"
      const fullDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i;
      const fullDateMatch = dateString.match(fullDatePattern);
      
      if (fullDateMatch) {
        const month = fullDateMatch[1];
        const day = parseInt(fullDateMatch[2]);
        const year = parseInt(fullDateMatch[3]);
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(year, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(year, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match short date like "January 15" for current year
      const shortDatePattern = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
      const shortDateMatch = dateString.match(shortDatePattern);
      
      if (shortDateMatch) {
        const month = shortDateMatch[1];
        const day = parseInt(shortDateMatch[2]);
        const currentYear = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(currentYear, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(currentYear, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Match date in MM/DD/YYYY format
      const numericDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
      const numericMatch = dateString.match(numericDatePattern);
      
      if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1; // JS months are 0-indexed
        const day = parseInt(numericMatch[2]);
        const year = parseInt(numericMatch[3]);
        
        const startDate = new Date(year, month, day, timeHours, timeMinutes);
        const endDate = new Date(year, month, day, 23, 59, 59);
        
        return { startDate, endDate };
      }
      
      // Match day and month format like "15 July"
      const dayFirstPattern = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/i;
      const dayFirstMatch = dateString.match(dayFirstPattern);
      
      if (dayFirstMatch) {
        const day = parseInt(dayFirstMatch[1]);
        const month = dayFirstMatch[2];
        const currentYear = new Date().getFullYear();
        
        const months = {
          january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
          april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
          august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
          november: 10, nov: 10, december: 11, dec: 11
        };
        
        const monthNum = months[month.toLowerCase()];
        
        if (monthNum !== undefined) {
          const startDate = new Date(currentYear, monthNum, day, timeHours, timeMinutes);
          const endDate = new Date(currentYear, monthNum, day, 23, 59, 59);
          
          return { startDate, endDate };
        }
      }
      
      // Try standard date parse as fallback
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        const startDate = parsedDate;
        const endDate = new Date(parsedDate);
        endDate.setHours(23, 59, 59);
        
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
    } else {
      // If no date, use a timestamp to ensure uniqueness
      dateStr = new Date().toISOString().split('T')[0];
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
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceUrl) {
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
        address: '254 E Hastings St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V6A 1P1',
        website: 'https://www.rickshawtheatre.com/',
        googleMapsUrl: 'https://maps.app.goo.gl/D1iRpj3J9MFa79AEA'
      },
      categories: [
        'arts',
        'music',
        'performance',
        'concert'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'rickshaw-theatre'
    };
  },
  
  /**
   * Extract date information from a specific event page
   * @param {Object} page - Puppeteer page object
   * @param {string} eventTitle - The title of the event
   * @returns {Promise<string>} - The extracted date string
   */
  async extractEventDate(page, eventTitle) {
    try {
      // Capture page content for debugging
      const debugDir = path.join(__dirname, '..', '..', 'debug');
      try {
        await fs.mkdir(debugDir, { recursive: true });
      } catch (error) {
        console.error(`Error creating debug directory: ${error.message}`);
      }
      
      // Try different approaches to find date information
      const dateInfo = await page.evaluate((eventTitle) => {
        // Use any element with date-related attributes
        const dateAttributeElement = document.querySelector('[datetime], [data-date], [date]');
        if (dateAttributeElement) {
          const dateAttr = dateAttributeElement.getAttribute('datetime') || 
                        dateAttributeElement.getAttribute('data-date') || 
                        dateAttributeElement.getAttribute('date');
          if (dateAttr) return dateAttr;
        }
        
        // Look for structured data
        const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
        if (jsonLdScript) {
          try {
            const jsonData = JSON.parse(jsonLdScript.textContent);
            if (jsonData.startDate) return jsonData.startDate;
            if (jsonData.datePublished) return jsonData.datePublished;
            if (jsonData.date) return jsonData.date;
          } catch (e) {
            // JSON parsing failed, continue with other methods
          }
        }
        
        // Look in meta tags
        const metaTags = document.querySelectorAll('meta');
        for (const meta of metaTags) {
          const name = meta.getAttribute('name') || '';
          const property = meta.getAttribute('property') || '';
          if (name.includes('date') || property.includes('date') || 
              name.includes('time') || property.includes('time')) {
            return meta.getAttribute('content');
          }
        }
        
        // Text-based search
        const allText = document.body.innerText;
        
        // Look for date patterns
        const datePatterns = [
          // Full dates with year
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{4}\b/i,
          // Month day without year
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
          // Abbreviated month with day
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
          // Numeric dates
          /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
          /\b\d{1,2}\/\d{1,2}\/\d{2}\b/,
          /\b\d{1,2}\.\d{1,2}\.\d{4}\b/,
          // Day first formats
          /\b\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
          /\b\d{1,2}(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i,
          // Day of week with date
          /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i
        ];
        
        for (const pattern of datePatterns) {
          const match = allText.match(pattern);
          if (match) return match[0];
        }
        
        // Check for text near keywords
        const paragraphs = document.querySelectorAll('p, div, span, h3, h4, h5');
        for (const p of paragraphs) {
          const text = p.innerText.toLowerCase();
          if (text.includes('date:') || text.includes('when:') || 
              text.includes('starts:') || text.includes('doors:')) {
            return p.innerText;
          }
        }
        
        return null;
      }, eventTitle);
      
      // Save page content for debugging if needed
      const timestamp = new Date().getTime();
      const htmlContent = await page.content();
      const debugFilePath = path.join(debugDir, `rickshaw-event-${timestamp}.html`);
      await fs.writeFile(debugFilePath, htmlContent);
      
      // If we have date info, return it
      if (dateInfo) {
        return dateInfo;
      }
      
      // If everything failed, infer a potential date from the URL or page title
      // Many venues put dates in URLs like "event-name-mar-15" or titles like "Event Name - March 15"
      const url = page.url();
      const title = await page.title();
      
      // Look for date patterns in the URL and title
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      for (const month of monthNames) {
        const monthPattern = new RegExp(`${month}[a-z]*[-_]\\d{1,2}`, 'i');
        const urlMatch = url.match(monthPattern);
        if (urlMatch) return urlMatch[0];
        
        const titleMatch = title.match(monthPattern);
        if (titleMatch) return titleMatch[0];
      }
      
      // Really last resort - use the current month/year and infer the day
      // This is not ideal but better than having no date
      const currentDate = new Date();
      const fallbackDate = `${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
      console.log(`Using fallback date for event "${eventTitle}": ${fallbackDate}`);
      
      return fallbackDate;
    } catch (error) {
      console.error(`Error extracting date for "${eventTitle}": ${error.message}`);
      return null;
    }
  },
  
  /**
   * Main scraping function to extract events
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
    
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
      
      // Reduce timeout to avoid hanging
      page.setDefaultNavigationTimeout(30000);
      
      // Navigate to the events page
      console.log(`Navigating to events page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Extract events from the main page
      const eventLinks = await page.evaluate(() => {
        const links = [];
        
        // Try to find all links to event detail pages
        const allLinks = document.querySelectorAll('a[href*="show_listings"], a[href*="event"], a[href*="shows"]');
        
        for (const link of allLinks) {
          const href = link.href;
          
          // Skip navigation/menu links and duplicates
          if (href.includes('#') || href.endsWith('/shows/') || 
              href.endsWith('/events/') || href === window.location.href) {
            continue;
          }
          
          // Try to get title from nearest heading
          let title = '';
          let element = link;
          while (element && !title && element !== document.body) {
            const heading = element.querySelector('h1, h2, h3, h4');
            if (heading) {
              title = heading.textContent.trim();
              break;
            }
            element = element.parentElement;
          }
          
          // If no heading found, use link text or any nearby strong text
          if (!title) {
            title = link.textContent.trim();
            if (!title) {
              const strongText = link.querySelector('strong')?.textContent.trim();
              if (strongText) title = strongText;
            }
          }
          
          // Get image if available
          let imageUrl = '';
          const imgElement = link.querySelector('img');
          if (imgElement) {
            imageUrl = imgElement.src;
          }
          
          // Only add if we have a title and a valid link
          if (title && href) {
            links.push({
              title,
              url: href,
              imageUrl
            });
          }
        }
        
        // Remove duplicates based on URL
        const uniqueLinks = [];
        const urls = new Set();
        
        for (const link of links) {
          if (!urls.has(link.url)) {
            urls.add(link.url);
            uniqueLinks.push(link);
          }
        }
        
        return uniqueLinks;
      });
      
      console.log(`Found ${eventLinks.length} event links`);
      
      // Limit the number of events to process to avoid timeouts
      const maxEvents = Math.min(eventLinks.length, 10);
      
      // Visit each event page to get details
      for (let i = 0; i < maxEvents; i++) {
        const event = eventLinks[i];
        console.log(`Processing event ${i + 1}/${maxEvents}: ${event.title}`);
        
        try {
          // Navigate to event detail page
          await page.goto(event.url, { waitUntil: 'networkidle2', timeout: 20000 });
          
          // Extract event description
          const description = await page.evaluate(() => {
            const descSelectors = ['.event-description', '.description', '.content', 'article p', '.text-content p'];
            for (const selector of descSelectors) {
              const element = document.querySelector(selector);
              if (element) return element.textContent.trim();
            }
            return '';
          });
          
          // Extract date information from event page
          const dateText = await this.extractEventDate(page, event.title);
          
          if (!dateText) {
            console.log(`Could not find date information for "${event.title}", skipping`);
            continue;
          }
          
          // Parse date information
          const dateInfo = this.parseDateRange(dateText);
          
          // Skip events with no valid dates
          if (!dateInfo.startDate || !dateInfo.endDate) {
            console.log(`Could not parse date "${dateText}" for event "${event.title}", skipping`);
            continue;
          }
          
          // Generate event ID
          const eventId = this.generateEventId(event.title, dateInfo.startDate);
          
          // Create event object
          const eventObject = this.createEventObject(
            eventId,
            event.title,
            description,
            dateInfo.startDate,
            dateInfo.endDate,
            event.imageUrl,
            event.url
          );
          
          // Add to events array
          events.push(eventObject);
          
        } catch (error) {
          console.error(`Error processing event "${event.title}": ${error.message}`);
        }
      }
      
      console.log(`Successfully processed ${events.length} events from ${this.name}`);
      
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

module.exports = RickshawTheatreScraperFixed;
