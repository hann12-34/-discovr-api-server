/**
 * Biltmore Cabaret Events Scraper
 * Website: https://www.biltmorecabaret.com/
 */
const axios = require('axios');
const cheerio = require('cheerio');
const { Event } = require('../../models/Event');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @param {Object} [logger] - Optional logger object for tracing
 * @returns {Date|null} - Parsed date object or null if parsing fails
 */
function parseEventDate(dateString, logger = null) {
  // Initialize logger if not provided
  const log = logger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Biltmore Cabaret' });
  
  try {
    if (!dateString) {
      log.warn('No date string provided');
      return null;
    }
    
    const dateStr = dateString.trim();
    log.debug(`Attempting to parse date: "${dateStr}"`);
    
    // Current year to use for dates without year
    const currentYear = 2025;
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      log.debug(`Parsed with standard format: ${date.toISOString()}`);
      return date;
    }
    
    // Try formats like "DD MMM YYYY" or "DD MMM"
    const dateMatch = dateStr.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s+(\d{4}))?\b/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
      const parsedDate = new Date(year, month, day);
      log.debug(`Parsed with DD MMM [YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
      return parsedDate;
    }
    
    // Try formats like "MMM DD, YYYY" or "MMM DD"
    const altMatch = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
    if (altMatch) {
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(altMatch[1].toLowerCase().substring(0, 3));
      const day = parseInt(altMatch[2]);
      const year = altMatch[3] ? parseInt(altMatch[3]) : currentYear;
      const parsedDate = new Date(year, month, day);
      log.debug(`Parsed with MMM DD[, YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
      return parsedDate;
    }
    
    // Format: YYYY-MM-DD (ISO format)
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1; // JS months are 0-indexed
      const day = parseInt(isoMatch[3]);
      const parsedDate = new Date(year, month, day);
      log.debug(`Parsed with ISO format: ${parsedDate.toISOString()}`);
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
        log.debug(`Parsed with numeric MM/DD[/YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
        return parsedDate;
      }
    }
    
    // Special keywords like "today", "tomorrow"
    if (dateStr.toLowerCase() === 'today') {
      const today = new Date();
      log.debug(`Parsed keyword 'today': ${today.toISOString()}`);
      return today;
    } else if (dateStr.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      log.debug(`Parsed keyword 'tomorrow': ${tomorrow.toISOString()}`);
      return tomorrow;
    }
    
    // Handle date ranges by taking first date
    const rangeDateMatch = dateStr.match(/^([^-]+)\s*-/);
    if (rangeDateMatch) {
      const firstDatePart = rangeDateMatch[1].trim();
      log.debug(`Attempting to parse first part of date range: ${firstDatePart}`);
      return parseEventDate(firstDatePart, log); // Recursive call with first part
    }
    
    log.warn(`Could not parse Biltmore Cabaret date: "${dateStr}"`);
    return null;
  } catch (error) {
    log.error({ error }, `Error parsing Biltmore Cabaret date: "${dateString}"`);
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
 * Scrapes events from Biltmore Cabaret
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Biltmore Cabaret' });
  const events = [];
  const venue = {
    name: "Biltmore Cabaret",
    address: "2755 Prince Edward St",
    city: "Vancouver",
    state: "BC",
    country: "Canada",
    postalCode: "V5T 3A9",
    website: "https://www.biltmorecabaret.com/"
  };

  // Current year for date parsing
  const currentYear = 2025;
  
  try {
    // Step 1: Try with axios first
    logger.info('Starting Biltmore Cabaret scraper with axios');
    let eventData = [];
    
    try {
      const response = await axios.get('https://www.biltmorecabaret.com/event', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      // Look for event listings
      const eventElements = $('div[data-w-id], .event-item, .event-card, article');
      logger.info(`Found ${eventElements.length} potential event elements with axios`);
      
      if (eventElements.length > 0) {
        eventElements.each((i, elem) => {
          try {
            const $element = $(elem);
            
            // Extract event title
            const titleElement = $element.find('h2, h3, .event-title, .title');
            const title = titleElement.text().trim();
            
            if (!title) return; // Skip items without title
            
            // Extract event date
            const dateElement = $element.find('.date, .event-date, time');
            const dateText = dateElement.text().trim() || dateElement.attr('datetime');
            const eventDate = parseEventDate(dateText, logger);
            
            
            if (!eventDate) return; // Skip events without dates
            
            // Extract URL
            const linkElement = $element.find('a') || $element.closest('a');
            let eventUrl = linkElement.attr('href');
            
            // Make URL absolute if needed
            if (eventUrl && !eventUrl.startsWith('http')) {
              eventUrl = eventUrl.startsWith('/') 
                ? `https://www.biltmorecabaret.com${eventUrl}` 
                : `https://www.biltmorecabaret.com/${eventUrl}`;
            }
            
            // Extract image URL
            let imageUrl = '';
            const imgElement = $element.find('img');
            if (imgElement.length) {
              imageUrl = imgElement.attr('src') || imgElement.attr('data-src');
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = imageUrl.startsWith('/') 
                  ? `https://www.biltmorecabaret.com${imageUrl}` 
                  : `https://www.biltmorecabaret.com/${imageUrl}`;
              }
            }
            
            // Create event object
            events.push({
              title: title,
              date: eventDate,
              url: eventUrl || 'https://www.biltmorecabaret.com/event',
              venue: venue.name,
              location: {
                name: venue.name,
                address: venue.address,
                city: venue.city,
                province: venue.state,
                country: venue.country,
                postalCode: venue.postalCode
              },
              description: `Live event at the Biltmore Cabaret in Vancouver featuring ${title}`,
              imageUrl: imageUrl || 'https://www.biltmorecabaret.com/images/logo.png',
              price: 'Check website for ticket prices',
              categories: ['music', 'nightlife', 'entertainment'],
              tags: ['vancouver nightlife', 'mount pleasant', 'live music', 'biltmore cabaret'],
              season: getSeason(eventDate)
            });
            
            logger.info(`Added event: ${title} on ${eventDate.toDateString()}`);
          } catch (elemError) {
            logger.warn({ error: elemError }, `Error parsing event element: ${elemError.message}`);
            // Continue to next element
          }
        });
      }
    } catch (axiosError) {
      logger.warn({ error: axiosError }, `Error with axios approach: ${axiosError.message}, trying Puppeteer fallback`);
    }
    
    // Step 2: If no events or error occurred with axios, try with Puppeteer
    if (events.length === 0) {
      logger.info('No events found with axios, trying Puppeteer approach');
      
      try {
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
          
          // Go to the events page
          await page.goto('https://www.biltmorecabaret.com/event', { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
          });
          
          // Wait for content to load
          await page.waitForTimeout(2000);
          
          // Extract events from page
          const pageEvents = await page.evaluate((currentYear) => {
            const extractedEvents = [];
            
            // Find event elements
            const eventElements = document.querySelectorAll('div[data-w-id], .event-item, .event-card, article');
            
            for (const element of eventElements) {
              try {
                // Extract title
                const titleElement = element.querySelector('h2, h3, .event-title, .title');
                if (!titleElement) continue;
                const title = titleElement.textContent.trim();
                
                // Extract date
                const dateElement = element.querySelector('.date, .event-date, time');
                if (!dateElement) continue;
                const dateText = dateElement.textContent.trim() || dateElement.getAttribute('datetime');
                if (!dateText) continue;
                
                // Use current date if can't parse from page
                const eventDate = new Date();
                
                // Extract URL
                const linkElement = element.querySelector('a') || element.closest('a');
                let eventUrl = linkElement ? linkElement.href : '';
                
                // Extract image
                const imgElement = element.querySelector('img');
                let imageUrl = imgElement ? (imgElement.src || imgElement.getAttribute('data-src')) : '';
                
                extractedEvents.push({
                  title,
                  dateText,
                  eventUrl,
                  imageUrl
                });
              } catch (error) {
                console.error('Error parsing event element:', error);
              }
            }
            
            return extractedEvents;
          }, currentYear);
          
          // Process the extracted events
          for (const pageEvent of pageEvents) {
            try {
              // Parse date
              const dateText = pageEvent.dateText;
              let eventDate = new Date();
              
              // Try to parse the date
              if (dateText) {
                // Parse date with explicit year
                const dateMatch = dateText.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s+(\d{4}))?\b/i);
                if (dateMatch) {
                  const day = parseInt(dateMatch[1]);
                  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
                    .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
                  const year = dateMatch[3] ? parseInt(dateMatch[3]) : currentYear;
                  eventDate = new Date(year, month, day);
                } else {
                  // Try alternative format: MMM DD, YYYY
                  const altMatch = dateText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
                  if (altMatch) {
                    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
                      .indexOf(altMatch[1].toLowerCase().substring(0, 3));
                    const day = parseInt(altMatch[2]);
                    const year = altMatch[3] ? parseInt(altMatch[3]) : currentYear;
                    eventDate = new Date(year, month, day);
                  }
                }
              }
              
              // Create event object
              events.push({
                title: pageEvent.title,
                date: eventDate,
                url: pageEvent.eventUrl || 'https://www.biltmorecabaret.com/event',
                venue: venue.name,
                location: {
                  name: venue.name,
                  address: venue.address,
                  city: venue.city,
                  province: venue.state,
                  country: venue.country,
                  postalCode: venue.postalCode
                },
                description: `Live event at the Biltmore Cabaret in Vancouver featuring ${pageEvent.title}`,
                imageUrl: pageEvent.imageUrl || 'https://www.biltmorecabaret.com/images/logo.png',
                price: 'Check website for ticket prices',
                categories: ['music', 'nightlife', 'entertainment'],
                tags: ['vancouver nightlife', 'mount pleasant', 'live music', 'biltmore cabaret'],
                season: getSeason(eventDate)
              });
              
              logger.info(`Added event via Puppeteer: ${pageEvent.title} on ${eventDate.toDateString()}`);
            } catch (eventError) {
              logger.warn({ error: eventError }, `Error processing Puppeteer event: ${eventError.message}`);
            }
          }
          
        } catch (puppeteerError) {
          logger.error({ error: puppeteerError }, `Puppeteer error: ${puppeteerError.message}`);
        } finally {
          await browser.close();
        }
      } catch (puppeteerSetupError) {
        logger.error({ error: puppeteerSetupError }, `Error setting up Puppeteer: ${puppeteerSetupError.message}`);
      }
    }
    
    logger.info(`Completed Biltmore Cabaret scraping, found ${events.length} events`);
    return events;
  } catch (error) {
    logger.error({ error }, 'Error scraping Biltmore Cabaret');
    return [];
  }
}

module.exports = {
  name: 'Biltmore Cabaret',
  url: 'https://www.biltmorecabaret.com/',
  urls: ['https://www.biltmorecabaret.com/', 'https://www.biltmorecabaret.com/event'],
  scrape
};
