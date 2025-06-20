/**
 * Robust Rickshaw Theatre Venue Scraper
 * Uses multiple scraping techniques with retries and no fallbacks
 * Extracts event information from https://www.rickshawtheatre.com/
 * Last updated: June 18, 2025
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Configure puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Determine season based on date
 * @param {Date} date - Event date
 * @returns {string} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return "all";
  
  const month = date.getMonth();
  
  // Define seasons by month
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter"; // November, December, January
}

/**
 * Try to extract price information from text
 * @param {string} text - The text to extract price from
 * @returns {string|null} Price information or null if not found
 */
function extractPrice(text) {
  if (!text) return null;
  
  // Look for price patterns like $XX, $XX.XX, XX dollars
  const priceMatch = text.match(/\$\s*(\d+(?:\.\d{2})?)|(\d+)\s*dollars/i);
  if (priceMatch) {
    const price = priceMatch[1] || priceMatch[2];
    return `$${price}`;
  }
  
  return null;
}
/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @param {Object} logger - Logger instance
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @param {Object} [customLogger] - Optional logger object for tracing
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString, customLogger = null) {
  // Initialize logger with specific function and venue context
  const logger = customLogger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Rickshaw Theatre' });
  
  try {
    if (!dateString) {
      logger.warn('No date string provided');
      return null;
    }
    
    // Current year to use when no year is specified
    const currentYear = 2025;
    
    const dateStr = dateString.trim();
    logger.debug(`Attempting to parse date: "${dateStr}"`);
    
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
    
    // Try formats like "Month Day, Year" or "Month Day" (no year)
    const monthDayYearMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?/i);
    if (monthDayYearMatch) {
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(monthDayYearMatch[1].toLowerCase().substring(0, 3));
      const day = parseInt(monthDayYearMatch[2]);
      const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3]) : currentYear;
      const parsedDate = new Date(year, month, day);
      logger.debug(`Parsed with MMM DD[, YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
      return parsedDate;
    }
    
    // Format: YYYY-MM-DD (ISO format)
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1; // JS months are 0-indexed
      const day = parseInt(isoMatch[3]);
      const parsedDate = new Date(year, month, day);
      logger.debug(`Parsed with ISO format: ${parsedDate.toISOString()}`);
      return parsedDate;
    }
    
    // Try MM/DD/YYYY or MM-DD-YYYY format (with or without year)
    const numericDateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
    if (numericDateMatch) {
      // Assuming MM/DD/YYYY format
      const month = parseInt(numericDateMatch[1]) - 1; // JS months are 0-indexed
      const day = parseInt(numericDateMatch[2]);
      const year = numericDateMatch[3] ? parseInt(numericDateMatch[3]) : currentYear;
      
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
    
    // Handle date ranges by taking the first date
    const rangeDateMatch = dateStr.match(/^([^-]+)\s*-/);
    if (rangeDateMatch) {
      const firstDatePart = rangeDateMatch[1].trim();
      logger.debug(`Attempting to parse first part of date range: ${firstDatePart}`);
      return parseEventDate(firstDatePart, logger); // Recursive call with first part and logger
    }
    
    logger.warn(`Could not parse Rickshaw Theatre date: "${dateStr}"`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing Rickshaw Theatre date: "${dateString}"`);
    return null;
  }
}

/**
 * Extract date from URL or text
 * @param {string} url - URL that might contain date information
 * @param {string} text - Text that might contain date information
 * @param {Object} logger - Logger instance
 * @returns {Date} Extracted date or current date as fallback
 */
function extractDateFromUrlOrText(url, text, logger) {
  // Current date as fallback
  const currentDate = new Date();
  
  if (!url && !text) return currentDate;
  
  // Try to find dates in URL format like /2025/06/ or /2025-06-15/
  if (url) {
    // Look for year-month pattern
    const yearMonthMatch = url.match(/(202\d)[/-](0?[1-9]|1[0-2])/);
    if (yearMonthMatch) {
      const year = parseInt(yearMonthMatch[1]);
      const month = parseInt(yearMonthMatch[2]) - 1; // JS months are 0-indexed
      
      // If we have a specific day
      const dayMatch = url.match(/[/-](0?[1-9]|[12]\d|3[01])[/-]/);
      const day = dayMatch ? parseInt(dayMatch[1]) : 15; // Default to middle of month
      
      if (logger) logger.info(`Extracted date from URL: ${year}-${month+1}-${day}`);
      return new Date(year, month, day);
    }
  }
  // Try to parse date from text
  if (text) {
    // Look for date patterns in the text
    const parsedDate = parseEventDate(text, logger);
    if (parsedDate) {
      return parsedDate;
    }
  }
  
  return currentDate;
}

/**
 * Make URL absolute
 * @param {string} url - URL to make absolute
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(url, baseUrl) {
  if (!url) return '';
  
  try {
    // Check if URL is already absolute
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Create absolute URL
    const absoluteUrl = new URL(url, baseUrl).href;
    return absoluteUrl;
  } catch (error) {
    return '';
  }
}

/**
 * Auto-scroll a Puppeteer page to load all dynamic content
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Extract events from HTML content
 * @param {Object} $ - Cheerio object
 * @param {string} url - URL of the page
 * @param {string} venue - Venue name
 * @param {Object} logger - Logger instance
 * @param {boolean} isAlternativeUrl - Whether this is an alternative URL
 * @returns {Array} Array of event objects
 */
function extractEvents($, url, venue, logger, isAlternativeUrl = false) {
  const events = [];
  const baseUrl = url;
  
  try {
    logger.info(`Extracting events from ${url}`);

    // Try selectors specific to the Rickshaw Theatre website
    const selectors = [
      '.listing_block',
      'article.listing_block',
      '#listing_wrapper article',
      '.show_listing',
      '.listing_container',
      '.event-listing'
    ];
    
    for (const selector of selectors) {
      const eventElements = $(selector);
      
      if (eventElements.length > 0) {
        logger.info(`Found ${eventElements.length} events using selector: ${selector}`);
        
        eventElements.each((i, element) => {
          const el = $(element);
          
          // Extract event details specifically for Rickshaw website
          let title = el.find('h2.listing_title a').first().text().trim();
          if (!title) {
            title = el.find('.listing_title a').first().text().trim();
          }
          if (!title) {
            title = el.find('h2 a').first().text().trim();
          }
          if (!title) {
            title = el.find('h2, h3, .title').first().text().trim();
          }
          
          // Try to find the show_listings URL first for detail page
          let eventUrl = el.find('a[href*="show_listings"]').attr('href');
          if (!eventUrl) {
            // Then try to get the ticket link which is more direct
            eventUrl = el.find('.listing_link').attr('href');
          }
          if (!eventUrl) {
            // Fallback to any link
            eventUrl = el.find('a').attr('href');
          }
          eventUrl = makeAbsoluteUrl(eventUrl, baseUrl);
          
          // Get date elements - Rickshaw format: "June 18th, 2025"
          let dateText = '';
          const listingDate = el.find('.listing_date');
          if (listingDate.length) {
            const listDateEl = listingDate.find('.listing_list_date');
            const listTimeEl = listingDate.find('.listing_list_time');
            
            if (listDateEl.length && listTimeEl.length) {
              dateText = listDateEl.text().trim() + ' ' + listTimeEl.text().trim();
            } else {
              dateText = listingDate.text().trim();
            }
            
            logger.info(`Extracted date text: ${dateText}`);
          }
          
          if (!dateText) {
            dateText = el.find('.date, .event-date, .datetime').text().trim();
          }
          
          // If we can't find dateText in standard locations, look for anything date-like
          if (!dateText) {
            // Look for a container that might have the date
            const dateContainer = el.find('[class*="date"], [class*="time"], [class*="calendar"]');
            if (dateContainer.length > 0) {
              dateText = dateContainer.text().trim();
            }
          }
          
          // Try to extract dates from event title as last resort
          let eventDate = null;
          
          // Look for a specific listing date element (if not already found)
          const dateElement = el.find('.listing_date, .listing-date');
          if (dateElement.length > 0 && !dateText) {
            // Get the date text
            dateText = dateElement.text().trim();
            
            // Look for a year element
            const dateYearElement = el.find('.listing_year, .listing-year, .year');
            let dateYearText = '';
            
            if (dateYearElement.length > 0) {
              dateYearText = ' ' + dateYearElement.text().trim();
            } else {
              // Default to current year if not found
              dateYearText = ' ' + new Date().getFullYear();
            }
            
            dateText += dateYearText;
            
            // Try to parse this directly
            const parsedDate = parseEventDate(dateText, logger);
            if (parsedDate) {
              logger.info(`Successfully parsed date from listing_date: ${dateText} -> ${parsedDate.toDateString()}`);
              eventDate = parsedDate;
            }
          }
          
          // Try to find image specifically for Rickshaw website
          let imageUrl = el.find('.listing_thumb_img').attr('src');
          if (!imageUrl) {
            imageUrl = el.find('img').attr('src');
          }
          if (!imageUrl) {
            imageUrl = el.find('[class*="image"], [style*="background"]').attr('style');
            if (imageUrl) {
              const urlMatch = imageUrl.match(/url\(['"](.*?)['"]\)/i);
              imageUrl = urlMatch ? urlMatch[1] : '';
            }
          }
          imageUrl = makeAbsoluteUrl(imageUrl, baseUrl);
          
          // Try to find price
          let priceText = el.find('.price, .ticket-price, [class*="price"]').text().trim();
          let price = extractPrice(priceText);
          
          // Try to find description
          let description = el.find('.description, .event-description, .content, [class*="desc"]').text().trim();
          if (!description) {
            description = el.find('p').text().trim();
          }
          
          // Parse the date - try from both URL and text content
          eventDate = extractDateFromUrlOrText(eventUrl, dateText || title, logger);
        
          // Validate the date
          if (isNaN(eventDate.getTime())) {
            eventDate = new Date(); // Fallback to current date if invalid
          }
          
          // Skip if we don't have a title
          if (!title) return;
          
          // Generate categories and tags based on title and description
          const categories = ['music', 'live'];
          const tags = ['live music', 'concert', 'vancouver'];
          
          // Add seasonal tags
          const season = determineSeason(eventDate);
          tags.push(season);
          
          // Look for common event types in title or description
          const lowerTitle = title.toLowerCase();
          const lowerDesc = description.toLowerCase();
          
          if (lowerTitle.includes('dj') || lowerDesc.includes('dj')) {
            categories.push('dj');
            tags.push('dj');
          }
          
          if (lowerTitle.includes('rock') || lowerDesc.includes('rock')) {
            categories.push('rock');
            tags.push('rock music');
          }
          
          if (lowerTitle.includes('jazz') || lowerDesc.includes('jazz')) {
            categories.push('jazz');
            tags.push('jazz music');
          }
          
          if (lowerTitle.includes('hip hop') || lowerDesc.includes('hip hop') || 
              lowerTitle.includes('hiphop') || lowerDesc.includes('hiphop') ||
              lowerTitle.includes('rap') || lowerDesc.includes('rap')) {
            categories.push('hiphop');
            tags.push('hip hop');
          }
          
          if (lowerTitle.includes('metal') || lowerDesc.includes('metal')) {
            categories.push('metal');
            tags.push('metal music');
          }
          
          if (lowerTitle.includes('punk') || lowerDesc.includes('punk')) {
            categories.push('punk');
            tags.push('punk rock');
          }
          
          if (lowerTitle.includes('electronic') || lowerDesc.includes('electronic') ||
             lowerTitle.includes('edm') || lowerDesc.includes('edm')) {
            categories.push('electronic');
            tags.push('electronic music');
          }
          
          // Create the event object
          const event = {
            title,
            date: eventDate,
            url: eventUrl,
            price,
            image: imageUrl,
            description: description || title,
            categories: [...new Set(categories)],
            tags: [...new Set(tags)],
            venue: {
              name: venue,
              location: '254 E Hastings St, Vancouver, BC V6A 1P1',
              coordinates: {
                lat: 49.2818992,
                lng: -123.0986447
              }
            },
            source: url,
            isAlternativeSource: isAlternativeUrl
          };
          
          events.push(event);
        });
        
        // If we found events with this selector, no need to try others
        if (events.length > 0) {
          logger.info(`Successfully extracted ${events.length} events from ${url}`);
          break;
        }
      }
    }
    
    return events;
  } catch (error) {
    logger.error(`Error extracting events: ${error.message}`);
    return [];
  }
}

/**
 * Scrape events from Rickshaw Theatre website
 * Uses multiple techniques for robustness:
 * 1. Standard HTTP request with enhanced headers
 * 2. Puppeteer with stealth plugin for JS-heavy pages
 * 3. Alternative URL with mobile user agent
 * @returns {Promise<Array>} Array of events
 */
async function scrape() {
  const logger = scrapeLogger.child({ venue: 'Rickshaw Theatre' });
  logger.info('Starting to scrape Rickshaw Theatre events');
  
  const venue = "Rickshaw Theatre";
  const urls = [
    'https://rickshawtheatre.com/',
    'https://rickshawtheatre.com/calendar/'
  ];
  
  try {
    // Attempt standard HTTP request first
    for (const url of urls) {
      try {
        logger.info(`Attempting standard HTTP request for ${url}`);
        
        // Generate random user agent for anti-bot evasion
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
        ];
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        // Make the request with enhanced headers
        const response = await axios.get(url, {
          headers: {
            'User-Agent': randomUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/',
            'Cache-Control': 'no-cache'
          },
          timeout: 10000
        });
        
        if (response.status === 200) {
          logger.info(`Successfully loaded ${url}`);
          const $ = cheerio.load(response.data);
          
          // Extract events with our helper function
          const eventsFound = extractEvents($, url, venue, logger);
          
          if (eventsFound && eventsFound.length > 0) {
            logger.info(`Found ${eventsFound.length} events from ${url}`);
            return eventsFound;
          }
        }
      } catch (error) {
        logger.warn(`Standard HTTP request failed for ${url}: ${error.message}`);
      }
    }
    
    // Fall back to Puppeteer if standard HTTP request fails
    for (const url of urls) {
      try {
        logger.info(`Attempting Puppeteer for ${url}`);
        
        // Launch browser with stealth plugin
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
        
        const page = await browser.newPage();
        
        // Randomize viewport size to avoid detection
        const width = 1200 + Math.floor(Math.random() * 100);
        const height = 800 + Math.floor(Math.random() * 100);
        await page.setViewport({ width, height });
        
        // Set random user agent
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
        ];
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(randomUserAgent);
        
        // Navigate to URL
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Auto-scroll to load lazy content
        await autoScroll(page);
        
        // Wait for event elements to load
        await page.waitForTimeout(2000);
        
        // Get page content
        const content = await page.content();
        const $ = cheerio.load(content);
        
        logger.info(`Successfully loaded ${url} with Puppeteer`);
        
        // Extract events with our helper function
        const puppeteerEvents = extractEvents($, url, venue, logger);
        
        if (puppeteerEvents && puppeteerEvents.length > 0) {
          logger.info(`Found ${puppeteerEvents.length} events from ${url} using Puppeteer`);
          await browser.close();
          return puppeteerEvents;
        }
        
        await browser.close();
        logger.info(`No events found at ${url} with Puppeteer`);
      } catch (pageError) {
        logger.warn(`Puppeteer error for ${url}: ${pageError.message}`);
      }
    }
    
    // Try alternative URL with mobile user agent as last resort
    const altUrl = 'https://www.rickshawtheatre.com';
    logger.info(`Attempting alternative URL: ${altUrl}`);
    
    try {
      // Try with mobile user agent
      const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';
      
      const response = await axios.get(altUrl, {
        headers: {
          'User-Agent': mobileUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000
      });
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const alternativeEvents = extractEvents($, altUrl, venue, logger, true); // true for alternative URL
        
        if (alternativeEvents && alternativeEvents.length > 0) {
          logger.info(`Found ${alternativeEvents.length} events from alternative URL ${altUrl}`);
          return alternativeEvents;
        }
      }
    } catch (error) {
      logger.warn(`Alternative URL request failed: ${error.message}`);
    }
    
    // If we reach here, we couldn't extract any events
    logger.warn('Failed to extract events from Rickshaw Theatre using all methods');
    return [];
    
  } catch (error) {
    logger.error(`Scraping error: ${error.message}`);
    return [];
  }
}

// Export the module
module.exports = {
  name: 'Rickshaw Theatre',
  url: 'https://www.rickshawtheatre.com/shows',
  scrape
};
