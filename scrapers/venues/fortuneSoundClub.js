/**
 * Robust Fortune Sound Club venue scraper
 * Uses multiple scraping techniques with retries
 * Scrapes events from https://fortunesoundclub.com
 * Last updated: 2025-06-18
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../../utils/logger');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { fetchWithRetry } = require('../../utils/scraperHelper');

// Configure puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Parse date string in various formats
 * @param {String} dateString - Date string to parse
 * @param {Object} [customLogger] - Optional logger object for tracing
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseEventDate(dateString, customLogger = null) {
  // Initialize logger with specific function and venue context
  const logger = customLogger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Fortune Sound Club' });
  try {
    if (!dateString) {
      logger.warn('No date string provided');
      return null;
    }
  
    const dateStr = dateString.trim();
    // Current year to use when no year is specified
    const currentYear = 2025;
    
    logger.debug(`Attempting to parse date: "${dateStr}"`);
    
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
    // Try direct parsing first
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      logger.debug(`Parsed with standard format: ${parsedDate.toISOString()}`);
      return parsedDate;
    }
    
    // Month name mapping for various formats
    const monthMapping = {
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
    
    // Try formats like "Month Day, Year" or "Month Day" (no year)
    const monthDayYearRegex = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?/i;
    const monthDayMatch = dateString.match(monthDayYearRegex);
    
    if (monthDayMatch) {
      const month = monthDayMatch[1];
      const day = monthDayMatch[2];
      const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : currentYear;
      
      const monthIndex = monthMapping[month.toLowerCase()];
      if (monthIndex !== undefined) {
        const dateObj = new Date(year, monthIndex, parseInt(day));
        logger.debug(`Parsed with "Month Day[, Year]" format: ${dateObj.toISOString()}, using year: ${year}`);
        return dateObj;
      }
    }
    
    // Try formats like "DD Month YYYY" or "DD Month" (no year)
    const dayMonthYearRegex = /(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:[,\s]+(\d{4}))?/i;
    const dayMonthMatch = dateString.match(dayMonthYearRegex);
    
    if (dayMonthMatch) {
      const day = dayMonthMatch[1];
      const month = dayMonthMatch[2];
      const year = dayMonthMatch[3] ? parseInt(dayMonthMatch[3]) : currentYear;
      
      const monthIndex = monthMapping[month.toLowerCase()];
      if (monthIndex !== undefined) {
        const dateObj = new Date(year, monthIndex, parseInt(day));
        logger.debug(`Parsed with "DD Month[, Year]" format: ${dateObj.toISOString()}, using year: ${year}`);
        return dateObj;
      }
    }
    
    // Format: MM/DD/YYYY or MM-DD-YYYY (with or without year)
    const numericDateRegex = /(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?/;
    const numericMatch = dateString.match(numericDateRegex);
    
    if (numericMatch) {
      // Assuming MM/DD/YYYY format (US format)
      const month = parseInt(numericMatch[1]) - 1; // JS months are 0-based
      const day = parseInt(numericMatch[2]);
      const year = numericMatch[3] ? parseInt(numericMatch[3]) : currentYear;
      
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const dateObj = new Date(year, month, day);
        logger.debug(`Parsed with numeric format: ${dateObj.toISOString()}, using year: ${year}`);
        return dateObj;
      }
    }
    
    // Format: YYYY-MM-DD (ISO format)
    const isoMatch = dateString.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1]);
      const month = parseInt(isoMatch[2]) - 1; // JS months are 0-based
      const day = parseInt(isoMatch[3]);
      
      const dateObj = new Date(year, month, day);
      logger.debug(`Parsed with ISO format: ${dateObj.toISOString()}`);
      return dateObj;
    }
    
    // Handle date ranges by taking the first date
    const rangeDateMatch = dateStr.match(/^([^-]+)\s*-/);
    if (rangeDateMatch) {
      const firstDatePart = rangeDateMatch[1].trim();
      logger.debug(`Attempting to parse first part of date range: ${firstDatePart}`);
      return parseEventDate(firstDatePart, logger); // Recursive call with first part and logger
    }
    
    logger.warn(`Could not parse Fortune Sound Club date: "${dateStr}"`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing Fortune Sound Club date: "${dateString}"`);
    return null;
  }
}

/**
 * Determine the season based on date
 * @param {Date} date - Date object
 * @returns {String} Season (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return 'unknown';
  
  const month = date.getMonth();
  
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Auto-scroll page to load lazy-loaded content
 * @param {Object} page - Puppeteer page object
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

        // Add random pauses to mimic human behavior
        if (Math.random() > 0.8) {
          clearInterval(timer);
          setTimeout(() => {
            timer;
          }, 500 + Math.floor(Math.random() * 1000));
        }

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100 + Math.floor(Math.random() * 50)); // Randomized scroll timing
    });
  });
}

/**
 * Extract events from DOM with multiple selector strategies
 * @param {Object} $ - Cheerio object
 * @param {Object} logger - Logger object
 * @param {boolean} isAlternativeUrl - Whether using alternative URL
 * @returns {Array} Array of event objects
 */
function extractEvents($, logger, isAlternativeUrl = false) {
  const events = [];
  logger.info("Extracting events from DOM");
  
  // Try multiple selector patterns for events
  const selectorStrategies = [
    // Strategy 1: Common event containers
    '.main-body .event, .events-list .event, .event-listing',
    // Strategy 2: Generic event cards
    '.event-card, .event-container, .event-item',
    // Strategy 3: List items with dates
    'li:has(time), div:has(time), div:has(.date)',
    // Strategy 4: Calendar entries
    '.calendar-entry, .event-calendar .item',
    // Strategy 5: Cards and blocks
    '.card, .content-block, article'
  ];
  
  // Try each selector strategy until events are found
  for (const selector of selectorStrategies) {
    const elements = $(selector);
    logger.info(`Trying selector: ${selector} - Found ${elements.length} potential elements`);
    
    if (elements.length > 0) {
      elements.each((i, element) => {
        try {
          // Try multiple selectors for title
          let title = '';
          const titleSelectors = ['.title', '.event-title', 'h1', 'h2', 'h3', 'h4', '.name', '.event-name', 'a[href*="events"]'];
          for (const titleSelector of titleSelectors) {
            title = $(element).find(titleSelector).first().text().trim();
            if (title) break;
          }
          
          // Try multiple selectors for date
          let dateText = '';
          const dateSelectors = ['.date', '.event-date', 'time', '.datetime', '.meta-date', 'span:contains("Date")'];
          for (const dateSelector of dateSelectors) {
            dateText = $(element).find(dateSelector).first().text().trim();
            if (dateText) break;
          }
          
          // Try to find title from nearest heading if not found
          if (!title) {
            const headings = $(element).find('h1, h2, h3, h4, h5, strong');
            if (headings.length > 0) title = headings.first().text().trim();
          }
          
          // If still no title, look for text with capitalized words
          if (!title) {
            const textNodes = $(element).contents().filter(function() {
              return this.nodeType === 3; // Text nodes only
            });
            if (textNodes.length > 0) {
              const text = textNodes.text().trim();
              const capitalized = text.match(/([A-Z][\w\s'&-]+)/);
              if (capitalized && capitalized[1] && capitalized[1].length > 3) {
                title = capitalized[1].trim();
              }
            }
          }
          
          // If still no dateText, look for text containing month names or dates
          if (!dateText) {
            const fullText = $(element).text();
            const dateMatch = fullText.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}[a-z]{0,2},? \d{4}/i);
            if (dateMatch && dateMatch[0]) {
              dateText = dateMatch[0];
            }
          }
          
          // Parse date if we have dateText
          const date = dateText ? parseEventDate(dateText, logger) : null;
          
          // Skip if we don't have the minimal required information
          if (!title || !date) {
            return;
          }
          
          // Find link
          let link = '';
          const linkElement = $(element).find('a').first();
          if (linkElement.length > 0) {
            link = linkElement.attr('href') || '';
          }
          const fullLink = link.startsWith('http') ? link : `https://fortunesoundclub.com${link.startsWith('/') ? '' : '/'}${link}`;
          
          // Find image
          let imageUrl = '';
          const imgElement = $(element).find('img').first();
          if (imgElement.length > 0) {
            imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `https://fortunesoundclub.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }
          }
          
          // Create event object
          events.push({
            title,
            startDate: date,
            endDate: null,
            venue: {
              name: "Fortune Sound Club",
              address: "147 E Pender St",
              city: "Vancouver",
              state: "BC",
              website: "https://fortunesoundclub.com"
            },
            sourceURL: fullLink,
            officialWebsite: "https://fortunesoundclub.com",
            imageURL: imageUrl,
            location: "147 E Pender St, Vancouver, BC",
            type: "Event",
            category: "Nightlife",
            season: determineSeason(date),
            status: "active",
            description: `${title} at Fortune Sound Club in Vancouver.`
          });
          
          logger.debug(`Extracted event: ${title} on ${date}`);
        } catch (err) {
          logger.warn(`Error processing event element: ${err.message}`);
        }
      });
      
      if (events.length > 0) {
        break; // Stop if we found events with this selector strategy
      }
    }
  }
  
  // Additional extraction for alternative URL structure
  if (isAlternativeUrl && events.length === 0) {
    // Look for any text containing dates and nearby headings
    const dateRegex = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}[a-z]{0,2},? \d{4}/i;
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (dateRegex.test(text)) {
        try {
          const dateMatch = text.match(dateRegex)[0];
          const date = parseEventDate(dateMatch, logger);
          if (!date) return;
          
          // Look for a title near this date
          let title = '';
          
          // Check siblings for potential titles
          const prevSib = $(el).prev();
          if (prevSib.length && !dateRegex.test(prevSib.text())) {
            title = prevSib.text().trim();
          }
          
          if (!title) {
            const nextSib = $(el).next();
            if (nextSib.length && !dateRegex.test(nextSib.text())) {
              title = nextSib.text().trim();
            }
          }
          
          if (!title) {
            // Try parent's children
            $(el).parent().children().each((i, child) => {
              if (child !== el && !dateRegex.test($(child).text())) {
                const potentialTitle = $(child).text().trim();
                if (potentialTitle && potentialTitle.length > 3 && potentialTitle.length < 100) {
                  title = potentialTitle;
                  return false; // Break each loop
                }
              }
            });
          }
          
          if (title && title.length > 3 && title.length < 100) {
            events.push({
              title,
              startDate: date,
              endDate: null,
              venue: {
                name: "Fortune Sound Club",
                address: "147 E Pender St",
                city: "Vancouver",
                state: "BC",
                website: "https://fortunesoundclub.com"
              },
              sourceURL: "https://fortunesoundclub.com/events",
              officialWebsite: "https://fortunesoundclub.com",
              imageURL: "",
              location: "147 E Pender St, Vancouver, BC",
              type: "Event",
              category: "Nightlife",
              season: determineSeason(date),
              status: "active",
              description: `${title} at Fortune Sound Club in Vancouver.`
            });
            
            logger.debug(`Extracted heuristic event: ${title} on ${date}`);
          }
        } catch (err) {
          logger.warn(`Error in heuristic extraction: ${err.message}`);
        }
      }
    });
  }
  
  return events;
}

async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Fortune Sound Club' });
  logger.info('Starting robust Fortune Sound Club scraper...');
  
  const events = [];
  const url = 'https://fortunesoundclub.com';
  
  try {
    // First attempt: Try Axios with enhanced headers
    logger.info("Attempt 1: Using Axios with enhanced headers");
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/search?q=fortune+sound+club+vancouver+events',
          'Cache-Control': 'max-age=0',
          'Connection': 'keep-alive',
          'Sec-Ch-Ua': '" Not A;Brand";v="99", "Chromium";v="98"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000,
        validateStatus: status => status < 500
      });
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        logger.info('Successfully loaded Fortune Sound Club website with Axios');
        
        const axiosEvents = extractEvents($, logger);
        
        if (axiosEvents && axiosEvents.length > 0) {
          logger.info(`Successfully scraped ${axiosEvents.length} events using Axios`);
          return axiosEvents;
        } else {
          logger.warn("Axios approach found zero events");
        }
      } else {
        logger.warn(`Axios request failed with status ${response.status}`);
      }
    } catch (axiosError) {
      logger.warn(`Axios scraping error: ${axiosError.message}`);
    }
      
    // Second attempt: Try with Puppeteer and stealth mode
    logger.info("Attempt 2: Using Puppeteer with stealth plugin");
    try {
      // Launch Puppeteer with stealth plugin
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      // Create a new page with a random user agent
      const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/98.0.4758.85 Mobile/15E148 Safari/604.1'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      try {
        const page = await browser.newPage();
        await page.setUserAgent(randomUserAgent);
        await page.setViewport({ width: 1280, height: 1024 });
        
        // Add extra headers to appear more like a real browser
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/'
        });
        
        // Navigate to the site and wait for content to load
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Auto-scroll to load any lazy content
        await autoScroll(page);
        
        // Wait a bit more for any remaining dynamic content
        await page.waitForTimeout(2000);
        
        // Get the final HTML and extract events
        const content = await page.content();
        const $ = cheerio.load(content);
        logger.info('Successfully loaded Fortune Sound Club website with Puppeteer');
        
        const puppeteerEvents = extractEvents($, logger);
        
        if (puppeteerEvents && puppeteerEvents.length > 0) {
          logger.info(`Successfully scraped ${puppeteerEvents.length} events using Puppeteer`);
          await browser.close();
          return puppeteerEvents;
        } else {
          logger.warn("Puppeteer approach found zero events");
        }
      } finally {
        await browser.close();
      }
    } catch (puppeteerError) {
      logger.warn(`Puppeteer scraping error: ${puppeteerError.message}`);
    }
    
    // Third attempt: Try alternative URL with mobile user agent
    logger.info("Attempt 3: Using alternative URL structure");
    try {
      const alternativeUrl = "https://fortunesoundclub.com/events";
      const response = await axios.get(alternativeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const alternativeEvents = extractEvents($, logger, true); // true for alternative URL
        
        if (alternativeEvents && alternativeEvents.length > 0) {
          logger.info(`Successfully scraped ${alternativeEvents.length} events from alternative URL`);
          return alternativeEvents;
        } else {
          logger.warn("Alternative URL approach found zero events");
        }
      }
    } catch (alternativeError) {
      logger.warn(`Alternative URL scraping error: ${alternativeError.message}`);
    }
  } catch (error) {
    logger.error(`Fatal error in Fortune Sound Club scraper: ${error.message}`);
    return [];
  }
}

module.exports = {
  name: "Fortune Sound Club",
  url: 'https://fortunesoundclub.com',
  urls: ["https://fortunesoundclub.com/", "https://fortunesoundclub.com/events"],
  scrape,
  parseEventDate,
  determineSeason,
  autoScroll,
  extractEvents
};
