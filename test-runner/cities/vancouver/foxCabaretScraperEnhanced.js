/**
 * Fox Cabaret Events Scraper (Enhanced Version)
 * Scrapes events from Fox Cabaret in Vancouver
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fox Cabaret Events Scraper
 */
const FoxCabaretScraper = {
  name: 'Fox Cabaret',
  url: 'https://www.foxcabaret.com/monthly-calendar-list',
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
   * Extract date information from URL path or segments
   * @param {string} url - The URL to analyze
   * @returns {string|null} - Date string if found, null otherwise
   */
  extractDateFromUrl(url) {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      
      // Look for year in the URL path
      const yearPattern = /^(202[0-9]|203[0-9])$/; // Years between 2020 and 2039
      const monthPattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
      
      // If we find a year in the path, it's likely part of a date
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        
        // Check if segment is a year
        if (yearPattern.test(segment)) {
          const year = segment;
          
          // Look for month in nearby segments
          for (let j = i - 1; j <= i + 1; j++) {
            if (j >= 0 && j < pathSegments.length) {
              const nearbySegment = pathSegments[j];
              if (monthPattern.test(nearbySegment)) {
                // We found a year and month, try to construct a date
                return `${nearbySegment} 1, ${year}`;
              }
            }
          }
          
          // If we found a year but no month, just return year
          return `January 1, ${year}`;
        }
      }
      
      // No clear year found, check if any path segments look like months
      for (const segment of pathSegments) {
        if (monthPattern.test(segment)) {
          // If we find a month in the path, assume current year
          const currentYear = new Date().getFullYear();
          return `${segment} 1, ${currentYear}`;
        }
      }
      
      // No date pattern found
      return null;
    } catch (error) {
      console.error(`Error extracting date from URL ${url}: ${error.message}`);
      return null;
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
    
    return `fox-cabaret-${slug}-${dateStr}`;
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
        name: 'Fox Cabaret',
        address: '2321 Main St',
        city: 'Vancouver',
        province: 'BC',
        country: 'Canada',
        postalCode: 'V5T 3C9',
        website: 'https://www.foxcabaret.com/',
        googleMapsUrl: 'https://maps.app.goo.gl/fPzcZZLFZJfzBLLY9'
      },
      categories: [
        'arts',
        'music',
        'performance',
        'concert'
      ],
      isFallback: false,
      lastUpdated: new Date(),
      sourceIdentifier: 'fox-cabaret'
    };
  },
  
  /**
   * Helper to sleep for a specified time
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after timeout
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const eventMap = new Map(); // For deduplication
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
      page.setDefaultNavigationTimeout(60000); // Increase timeout to 60s
      
      // Navigate to the events page - using the list view URL for better extraction
      console.log(`Navigating to events page: ${this.url}`);
      await page.goto(this.url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000  // Increase timeout to 60s
      });
      
      // Create debug directory if needed
      const debugDir = path.join(__dirname, '..', '..', 'debug');
      try {
        await fs.mkdir(debugDir, { recursive: true });
      } catch (error) {
        console.error(`Error creating debug directory: ${error.message}`);
      }
      
      // Save debug screenshot and HTML
      const timestamp = new Date().getTime();
      await page.screenshot({ path: path.join(debugDir, `fox-cabaret-${timestamp}.png`) });
      const html = await page.content();
      await fs.writeFile(path.join(debugDir, `fox-cabaret-${timestamp}.html`), html);
      
      // Extract events
      const eventsData = await page.evaluate(() => {
        const events = [];
        
        // Try to get the direct event blocks from the list view
        const eventBlocks = document.querySelectorAll('.summary-item');
        
        if (eventBlocks && eventBlocks.length > 0) {
          // Process each event block
          eventBlocks.forEach(block => {
            // Get title
            let title = '';
            const titleElement = block.querySelector('.summary-title');
            if (titleElement) {
              title = titleElement.textContent.trim();
            }
            
            // Skip if no title or title looks like a month (Jan, Feb, etc.)
            if (!title || /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(title)) {
              return;
            }
            
            // Get date from various possible elements
            let dateText = '';
            const dateElement = block.querySelector('.summary-metadata-item--date');
            if (dateElement) {
              dateText = dateElement.textContent.trim();
            }
            
            // Get description
            let description = '';
            const descElement = block.querySelector('.summary-excerpt');
            if (descElement) {
              description = descElement.textContent.trim();
            }
            
            // Get image
            let imageUrl = '';
            const imgElement = block.querySelector('img.summary-thumbnail-image');
            if (imgElement && imgElement.src) {
              imageUrl = imgElement.src;
            }
            
            // Get source URL
            let sourceUrl = '';
            const linkElement = block.querySelector('a.summary-title-link');
            if (linkElement && linkElement.href) {
              sourceUrl = linkElement.href;
            }
            
            // Only add event if we have at least a title and source URL
            if (title && sourceUrl) {
              events.push({
                title,
                dateText,
                description,
                imageUrl,
                sourceUrl
              });
            }
          });
        } else {
          // Fallback to looking for any potential event elements
          const possibleEventContainers = document.querySelectorAll('.sqs-block-content');
          
          possibleEventContainers.forEach(container => {
            // Look for links inside container that could be event titles
            const links = container.querySelectorAll('a');
            
            links.forEach(link => {
              const title = link.textContent.trim();
              
              // Skip empty or very short titles or month names
              if (!title || title.length < 3 || /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(title)) {
                return;
              }
              
              // Skip navigation links
              if (link.closest('nav') || link.closest('header') || link.closest('footer')) {
                return;
              }
              
              // Get source URL
              const sourceUrl = link.href;
              
              // Get image if it exists within the nearby elements
              let imageUrl = '';
              const parentNode = link.parentNode;
              const siblingImage = parentNode.querySelector('img') || 
                                  (parentNode.previousElementSibling && parentNode.previousElementSibling.querySelector('img')) ||
                                  (parentNode.parentNode && parentNode.parentNode.querySelector('img'));
              
              if (siblingImage && siblingImage.src) {
                imageUrl = siblingImage.src;
              }
              
              // Add to events
              events.push({
                title,
                dateText: '', // Most likely need to get date from event page
                description: '',
                imageUrl,
                sourceUrl
              });
            });
          });
        }
        
        return events;
      });
      
      console.log(`Found ${eventsData.length} potential events`);
      
      // Process at most 20 events to avoid long running time
      const eventsToProcess = eventsData.slice(0, 20);
      
      // Process events
      for (const eventData of eventsToProcess) {
        // Skip events without titles
        if (!eventData.title) {
          console.log('Skipping event with no title');
          continue;
        }
        
        // Skip events with titles that look like months
        if (/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(eventData.title)) {
          console.log(`Skipping month header: ${eventData.title}`);
          continue;
        }
        
        console.log(`Processing event: ${eventData.title}`);
        
        // Parse date
        let dateInfo = this.parseDateRange(eventData.dateText);
        
        // If we don't have a valid date, try to get it from the event page
        if (!dateInfo.startDate && eventData.sourceUrl && eventData.sourceUrl !== this.url) {
          try {
            console.log(`Getting date from event page: ${eventData.sourceUrl}`);
            
            // Add a small delay between requests to avoid rate limiting
            await this.sleep(1000);
            
            await page.goto(eventData.sourceUrl, { 
              waitUntil: 'domcontentloaded', 
              timeout: 30000 
            });
            
            // Extract date from event page
            const pageDate = await page.evaluate(() => {
              // Look for date elements
              const dateSelectors = [
                '[data-automation="event-date"]',
                '[data-automation="event-time"]',
                '[data-automation="event-datetime"]',
                '.event-date', 
                '.date', 
                '.time', 
                '.datetime',
                '.event-time',
                'time',
                '[itemprop="startDate"]',
                '[property="startDate"]',
                '.eventitem-meta-date'
              ];
              
              for (const selector of dateSelectors) {
                const element = document.querySelector(selector);
                if (element) return element.textContent.trim();
              }
              
              // Look for structured data
              const jsonLds = document.querySelectorAll('script[type="application/ld+json"]');
              for (const jsonLd of jsonLds) {
                try {
                  const data = JSON.parse(jsonLd.textContent);
                  if (data.startDate) return data.startDate;
                  if (data.date) return data.date;
                  if (data["@graph"]) {
                    for (const item of data["@graph"]) {
                      if (item.startDate) return item.startDate;
                    }
                  }
                } catch (e) {
                  // JSON parsing failed, continue to next
                }
              }
              
              // Look for month/year in the page URL or title as last resort
              const pageUrl = window.location.href;
              const urlMatch = pageUrl.match(/\/(202\d)\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
                              pageUrl.match(/\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/(202\d)/i);
              
              if (urlMatch) {
                const month = urlMatch[1].toLowerCase().startsWith('2') ? urlMatch[2] : urlMatch[1];
                const year = urlMatch[1].toLowerCase().startsWith('2') ? urlMatch[1] : urlMatch[2];
                return `${month} 1, ${year}`;
              }
              
              // Check if date appears in the title elements
              const titleElements = document.querySelectorAll('h1, h2, h3');
              const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}\b/i;
              
              for (const el of titleElements) {
                const match = el.textContent.match(datePattern);
                if (match) return match[0];
              }
              
              return null;
            });
            
            if (pageDate) {
              const pageDateInfo = this.parseDateRange(pageDate);
              if (pageDateInfo.startDate && pageDateInfo.endDate) {
                console.log(`Found date on event page: ${pageDate}`);
                dateInfo = pageDateInfo;
              }
            }
            
            // Try to get date from URL if we still don't have a valid date
            if (!dateInfo.startDate) {
              // Take screenshot of event page
              await page.screenshot({ path: path.join(debugDir, `fox-cabaret-event-${timestamp}-${slugify(eventData.title)}.png`) });
              await fs.writeFile(path.join(debugDir, `fox-cabaret-event-${timestamp}-${slugify(eventData.title)}.html`), await page.content());
            }
            
          } catch (error) {
            console.log(`Error getting date from event page: ${error.message}`);
          }
        }
        
        // If we still don't have a valid date, we don't include the event
        if (!dateInfo.startDate || !dateInfo.endDate) {
          console.log(`Could not get a valid date for "${eventData.title}", skipping`);
          continue;
        }
        
        // Generate ID
        const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
        
        // Create event object
        const event = this.createEventObject(
          eventId,
          eventData.title,
          eventData.description,
          dateInfo.startDate,
          dateInfo.endDate,
          eventData.imageUrl,
          eventData.sourceUrl
        );
        
        // Use a composite key of title + date for deduplication
        const eventKey = `${event.title}|${event.startDate ? event.startDate.toISOString() : ''}`;
        if (!eventMap.has(eventKey)) {
          eventMap.set(eventKey, event);
          events.push(event);
        }
      }
      
      console.log(`Successfully processed ${events.length} unique events from ${this.name}`);
      
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

module.exports = FoxCabaretScraper;
