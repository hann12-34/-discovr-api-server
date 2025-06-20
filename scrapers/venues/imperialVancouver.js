/**
 * Imperial Vancouver Events Scraper
 * Website: https://www.imperialvancouver.com/
 * Last updated: June 19, 2025 - Implemented full scraping logic with Puppeteer fallback
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
/**
 * Parse date string in various formats
 * @param {string} dateString - Date string to parse
 * @param {Object} [customLogger] - Optional logger object for tracing
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseEventDate(dateString, customLogger = null) {
  // Initialize logger with specific function and venue context
  const logger = customLogger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Imperial Vancouver' });
  
  try {
    if (!dateString) {
      logger.warn('No date string provided');
      return null;
    }
    
    // Current year to use when no year is specified
    const currentYear = 2025;
    
    const dateStr = dateString.trim();
    logger.debug(`Attempting to parse date: "${dateStr}"`);
    
    // Special keywords like "today", "tomorrow"
    if (dateStr.toLowerCase() === 'today' || dateStr.toLowerCase() === 'tonight') {
      const today = new Date();
      logger.debug(`Parsed keyword '${dateStr.toLowerCase()}': ${today.toISOString()}`);
      return today;
    } else if (dateStr.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      logger.debug(`Parsed keyword 'tomorrow': ${tomorrow.toISOString()}`);
      return tomorrow;
    }
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      logger.debug(`Parsed with standard format: ${date.toISOString()}`);
      return date;
    }
    
    // Try formats like "DD MMM YYYY" or "DD MMM" (no year)
    const dateMatch = dateStr.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s+(\d{4}))?\b/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
      const parsedDate = new Date(year, month, day);
      logger.debug(`Parsed with DD MMM [YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
      return parsedDate;
    }
    
    // Try formats like "MMM DD, YYYY" or "MMM DD" (no year)
    const altMatch = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
    if (altMatch) {
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(altMatch[1].toLowerCase().substring(0, 3));
      const day = parseInt(altMatch[2]);
      const year = altMatch[3] ? parseInt(altMatch[3]) : currentYear;
      const parsedDate = new Date(year, month, day);
      logger.debug(`Parsed with MMM DD[, YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
      return parsedDate;
    }
    
    // Try formats like "YYYY-MM-DD"
    const isoMatch = dateStr.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1; // JS months are 0-based
      const day = parseInt(isoMatch[3]);
      const parsedDate = new Date(year, month, day);
      logger.debug(`Parsed with ISO format: ${parsedDate.toISOString()}`);
      return parsedDate;
    }
    
    // Format: MM/DD/YYYY or MM-DD-YYYY (with or without year)
    const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
    if (numericMatch) {
      // Assuming MM/DD format
      const month = parseInt(numericMatch[1]) - 1; // JS months are 0-based
      const day = parseInt(numericMatch[2]);
      const year = numericMatch[3] ? parseInt(numericMatch[3]) : currentYear;
      
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const parsedDate = new Date(year, month, day);
        logger.debug(`Parsed with numeric MM/DD[/YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
        return parsedDate;
      }
    }
    
    // Special keywords like "today", "tomorrow"
    if (dateStr.toLowerCase() === 'today') {
      const today = new Date();
      logger.debug(`Parsed keyword 'today': ${today.toISOString()}`);
      return today;
    } else if (dateStr.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      logger.debug(`Parsed keyword 'tomorrow': ${tomorrow.toISOString()}`);
      return tomorrow;
    }
    
    // Handle date ranges by taking first date
    const rangeDateMatch = dateStr.match(/^([^-]+)\s*-/);
    if (rangeDateMatch) {
      const firstDatePart = rangeDateMatch[1].trim();
      logger.debug(`Attempting to parse first part of date range: ${firstDatePart}`);
      return parseEventDate(firstDatePart, logger); // Recursive call with first part and logger
    }
    
    logger.warn(`Could not parse Imperial Vancouver date: "${dateStr}"`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing Imperial Vancouver date: "${dateString}"`);
    return null;
  }
}

/**
 * Determine season based on date
 * @param {Date} date - Event date
 * @returns {string} Season name (spring, summer, fall, winter)
 */
function getSeason(date) {
  if (!date || !(date instanceof Date)) return 'unknown';
  
  const month = date.getMonth();
  
  // Spring: March to May
  if (month >= 2 && month <= 4) return 'spring';
  
  // Summer: June to August
  if (month >= 5 && month <= 7) return 'summer';
  
  // Fall: September to November
  if (month >= 8 && month <= 10) return 'fall';
  
  // Winter: December to February
  return 'winter';
}

/**
 * Make absolute URL from relative URL
 * @param {string} relativeUrl - Relative URL
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  // Create URL object from the base URL
  const base = new URL(baseUrl);
  
  // If relativeUrl starts with /, it's relative to the domain root
  if (relativeUrl.startsWith('/')) {
    return `${base.protocol}//${base.host}${relativeUrl}`;
  }
  
  // Otherwise it's relative to the current path
  return `${baseUrl.replace(/\/$/, '')}/${relativeUrl}`;
}

/**
 * Scrapes events from Imperial Vancouver
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Imperial Vancouver' });
  const events = [];
  const venue = {
    name: "Imperial Vancouver",
    address: "319 Main St",
    city: "Vancouver",
    state: "BC",
    country: "Canada",
    postalCode: "V6A 2S9",
    website: "https://www.imperialvancouver.com/"
  };
  
  try {
    logger.info('Starting Imperial Vancouver scraper');
    
    try {
      // Step 1: Try standard scraping approach with axios and cheerio
      const response = await axios.get('https://www.imperialvancouver.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      // First check if there's structured JSON-LD data for events
      const jsonLdScripts = $('script[type="application/ld+json"]');
      logger.info(`Found ${jsonLdScripts.length} JSON-LD scripts`);
      
      if (jsonLdScripts.length > 0) {
        let foundEvents = 0;
        
        jsonLdScripts.each((i, script) => {
          try {
            const jsonContent = JSON.parse($(script).html());
            
            // Check if this is an event or an array of events
            const eventData = Array.isArray(jsonContent) ? 
              jsonContent.filter(item => item['@type'] === 'Event') : 
              (jsonContent['@type'] === 'Event' ? [jsonContent] : []);
            
            eventData.forEach(event => {
              try {
                // Extract event details from JSON-LD
                const title = event.name || '';
                const dateStr = event.startDate || '';
                const url = event.url || venue.website;
                const imageUrl = event.image || '';
                const description = event.description || `Event at ${venue.name}`;
                
                // Parse the event date
                const eventDate = parseEventDate(dateStr, logger);
                if (!title || !eventDate) {
                  logger.debug(`Skipping JSON-LD event with missing title or date: ${title}`);
                  return; // Skip this event
                }
                
                // Create event object
                events.push({
                  title,
                  date: eventDate,
                  url: url,
                  venue: venue.name,
                  location: {
                    name: venue.name,
                    address: venue.address,
                    city: venue.city,
                    province: venue.state,
                    country: venue.country,
                    postalCode: venue.postalCode
                  },
                  description,
                  imageUrl,
                  price: event.offers?.price || 'Check website for ticket prices',
                  categories: ['music', 'nightlife', 'entertainment'],
                  tags: ['vancouver nightlife', 'downtown', 'live music', 'imperial vancouver'],
                  season: getSeason(eventDate)
                });
                
                foundEvents++;
                logger.info(`Added JSON-LD event: ${title} on ${eventDate.toDateString()}`);
              } catch (eventError) {
                logger.warn({ error: eventError }, `Error processing JSON-LD event: ${eventError.message}`);
              }
            });
          } catch (jsonError) {
            logger.warn({ error: jsonError }, `Error parsing JSON-LD: ${jsonError.message}`);
          }
        });
        
        logger.info(`Extracted ${foundEvents} events from JSON-LD data`);
      }
      
      // If no events from JSON-LD, try CSS selectors
      if (events.length === 0) {
        logger.info('No events found in JSON-LD, trying CSS selectors');
        
        // Look for event listings with various selectors that might match
        const eventElements = $('.event, .event-card, .event-listing, .show-listing, article, .grid-item');
        logger.info(`Found ${eventElements.length} potential event elements with CSS selectors`);
        
        if (eventElements.length > 0) {
          eventElements.each((i, element) => {
            try {
              const $element = $(element);
              
              // Extract event title
              const titleElement = $element.find('h2, h3, h4, .title, .event-title, .name');
              const title = titleElement.text().trim();
              
              if (!title) return; // Skip items without title
              
              // Extract event date
              const dateElement = $element.find('.date, .event-date, time, .datetime');
              const dateText = dateElement.text().trim() || dateElement.attr('datetime');
              
              if (!dateText) {
                logger.debug(`Event "${title}" missing date, skipping`);
                return;
              }
              
              const eventDate = parseEventDate(dateText, logger);
              if (!eventDate) {
                logger.debug(`Could not parse date for "${title}": ${dateText}, skipping`);
                return;
              }
              
              // Extract URL
              const linkElement = $element.find('a').first();
              let eventUrl = linkElement.attr('href');
              
              // Make URL absolute if needed
              eventUrl = eventUrl ? makeAbsoluteUrl(eventUrl, venue.website) : venue.website;
              
              // Extract image URL
              let imageUrl = '';
              const imgElement = $element.find('img');
              if (imgElement.length) {
                imageUrl = imgElement.attr('src') || imgElement.attr('data-src');
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = makeAbsoluteUrl(imageUrl, venue.website);
                }
              }
              
              // Extract description
              let description = $element.find('.description, .event-description, .blurb').text().trim();
              if (!description) {
                description = `${title} at Imperial Vancouver on ${eventDate.toDateString()}.`;
              }
              
              // Create event object
              events.push({
                title,
                date: eventDate,
                url: eventUrl,
                venue: venue.name,
                location: {
                  name: venue.name,
                  address: venue.address,
                  city: venue.city,
                  province: venue.state,
                  country: venue.country,
                  postalCode: venue.postalCode
                },
                description,
                imageUrl,
                price: 'Check website for ticket prices',
                categories: ['music', 'nightlife', 'entertainment'],
                tags: ['vancouver nightlife', 'downtown', 'live music', 'imperial vancouver'],
                season: getSeason(eventDate)
              });
              
              logger.info(`Added event from DOM: ${title} on ${eventDate.toDateString()}`);
            } catch (elemError) {
              logger.warn({ error: elemError }, `Error parsing event element: ${elemError.message}`);
            }
          });
        }
      }
    } catch (staticError) {
      logger.warn({ error: staticError }, `Error with static scraping: ${staticError.message}`);
    }
    
    // Step 2: If no events found, try with Puppeteer
    if (events.length === 0) {
      logger.info('No events found with static scraping, trying Puppeteer');
      
      try {
        // Dynamically import Puppeteer to avoid loading it unnecessarily
        const puppeteer = require('puppeteer-extra');
        const StealthPlugin = require('puppeteer-extra-plugin-stealth');
        puppeteer.use(StealthPlugin());
        
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        
        try {
          const page = await browser.newPage();
          
          // Set viewport and user agent
          await page.setViewport({ width: 1366, height: 768 });
          await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36');
          
          // Navigate to the events page
          await page.goto('https://www.imperialvancouver.com/', { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
          });
          
          // Wait for potential JS loading
          await page.waitForTimeout(2000);
          
          // Extract all potential event information
          const extractedEvents = await page.evaluate(() => {
            const events = [];
            
            // Try multiple selectors that might contain events
            const eventElements = document.querySelectorAll('.event, .event-card, .event-listing, .show-listing, article, .grid-item, [class*="event"]');
            
            for (const element of eventElements) {
              try {
                // Extract title
                const titleElement = element.querySelector('h2, h3, h4, .title, .event-title, .name');
                const title = titleElement ? titleElement.textContent.trim() : '';
                if (!title) continue;
                
                // Extract date
                const dateElement = element.querySelector('.date, .event-date, time, .datetime');
                const dateText = dateElement ? 
                  (dateElement.textContent.trim() || dateElement.getAttribute('datetime')) : '';
                if (!dateText) continue;
                
                // Extract URL
                const linkElement = element.querySelector('a');
                const eventUrl = linkElement ? linkElement.href : '';
                
                // Extract image
                const imgElement = element.querySelector('img');
                const imageUrl = imgElement ? 
                  (imgElement.src || imgElement.getAttribute('data-src')) : '';
                
                // Extract description
                const descElement = element.querySelector('.description, .event-description, .blurb');
                const description = descElement ? descElement.textContent.trim() : '';
                
                events.push({
                  title,
                  dateText,
                  eventUrl,
                  imageUrl,
                  description
                });
              } catch (error) {
                console.error('Error extracting event:', error);
              }
            }
            
            return events;
          });
          
          logger.info(`Found ${extractedEvents.length} potential events with Puppeteer`);
          
          // Process the extracted events
          for (const extractedEvent of extractedEvents) {
            try {
              const eventDate = parseEventDate(extractedEvent.dateText, logger);
              if (!eventDate) {
                logger.debug(`Could not parse date for "${extractedEvent.title}": ${extractedEvent.dateText}, skipping`);
                continue;
              }
              
              // Create event object
              events.push({
                title: extractedEvent.title,
                date: eventDate,
                url: extractedEvent.eventUrl || venue.website,
                venue: venue.name,
                location: {
                  name: venue.name,
                  address: venue.address,
                  city: venue.city,
                  province: venue.state,
                  country: venue.country,
                  postalCode: venue.postalCode
                },
                description: extractedEvent.description || `${extractedEvent.title} at Imperial Vancouver on ${eventDate.toDateString()}.`,
                imageUrl: extractedEvent.imageUrl || '',
                price: 'Check website for ticket prices',
                categories: ['music', 'nightlife', 'entertainment'],
                tags: ['vancouver nightlife', 'downtown', 'live music', 'imperial vancouver'],
                season: getSeason(eventDate)
              });
              
              logger.info(`Added event from Puppeteer: ${extractedEvent.title} on ${eventDate.toDateString()}`);
            } catch (eventError) {
              logger.warn({ error: eventError }, `Error processing Puppeteer event: ${eventError.message}`);
            }
          }
          
        } catch (puppeteerError) {
          logger.error({ error: puppeteerError }, `Error with Puppeteer page: ${puppeteerError.message}`);
        } finally {
          await browser.close();
        }
      } catch (puppeteerSetupError) {
        logger.error({ error: puppeteerSetupError }, `Error setting up Puppeteer: ${puppeteerSetupError.message}`);
      }
    }
    
    // Return the events, ensuring we have no duplicates
    const uniqueEvents = events.filter((event, index, self) =>
      index === self.findIndex(e => e.title === event.title && e.date.getTime() === event.date.getTime())
    );
    
    logger.info(`Completed Imperial Vancouver scraping, found ${uniqueEvents.length} unique events`);
    return uniqueEvents;
  } catch (error) {
    logger.error({ error }, 'Error scraping Imperial Vancouver');
    return [];
  }
}

module.exports = {
  name: 'Imperial Vancouver',
  urls: ['https://www.imperialvancouver.com/'],
  scrape
};
