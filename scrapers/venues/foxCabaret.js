/**
 * Robust Fox Cabaret venue scraper
 * Uses multiple scraping techniques with retries
 * No fallback mechanisms - only live scraping
 * Extracts event information from https://www.foxcabaret.com/monthly-calendar
 * Last updated: June 18, 2025
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { scrapeLogger } = require('../utils/logger');
const { parseEventDate, determineSeason } = require('../utils/dateParsing');

// Configure puppeteer with stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Determine if an event is upcoming based on its date
 * @param {Date} eventDate - Event date
 * @returns {boolean} True if the event is upcoming
 */
function isUpcomingEvent(eventDate) {
  if (!eventDate) return false;
  const now = new Date();
  return eventDate >= now;
}

// Note: determineSeason function is now imported from the dateParsing utility

/**
 * Make absolute URL from relative URL
 * @param {string} relativeUrl - Relative URL
 * @param {string} baseUrl - Base URL
 * @returns {string} Absolute URL
 */
function makeAbsoluteUrl(relativeUrl, baseUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const relative = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  
  return `${base}${relative}`;
}

/**
 * Extract events from HTML using multiple selector strategies
 * @param {Object} $ - Cheerio instance with loaded HTML
 * @param {string} sourceUrl - Source URL for the HTML
 * @param {Object} venue - Venue information object
 * @param {Object} logger - Logger instance
 * @param {boolean} isAlternative - Whether this is an alternative URL source
 * @returns {Array} Array of event objects
 */
function extractEvents($, sourceUrl, venue, logger, isAlternative = false) {
  logger.info("Attempting to extract events from Fox Cabaret HTML");
  const events = [];
  
  // Try multiple selector strategies
  const selectors = [
    ".eventlist-event",                        // Standard Squarespace event list
    ".summary-item-record-type-event",         // Alternative Squarespace template
    ".event-item",                            // Generic event item class
    ".event-card",                            // Common event card pattern
    "article.event",                          // Semantic HTML5 event article
    ".event-listing",                         // Common event listing class
    ".calendar-event-item"                     // Calendar-specific event item
  ];
  
  // Try each selector strategy
  for (const selector of selectors) {
    logger.info(`Trying selector strategy: ${selector}`);
    const eventElements = $(selector);
    
    if (eventElements.length > 0) {
      logger.info(`Found ${eventElements.length} events with selector ${selector}`);
      
      // Process each event element
      eventElements.each((i, element) => {
        try {
          const $element = $(element);
          
          // Extract event title with multiple selectors
          const titleSelectors = [
            ".summary-title", ".eventlist-title", "h1", "h2", ".event-name", ".title", ".event-title"
          ];
          
          let title = "";
          for (const titleSelector of titleSelectors) {
            const foundTitle = $element.find(titleSelector).first().text().trim();
            if (foundTitle) {
              title = foundTitle;
              break;
            }
          }
          
          // If no title found with selectors, try direct text content or attribute
          if (!title) {
            title = $element.attr("aria-label") || $element.attr("title") || $element.text().trim().split('\n')[0];
          }
          
          // Skip if still no title found
          if (!title) {
            logger.warn("Skipping event with no title");
            return;
          }
          
          // Extract event date using multiple methods
          let eventDate = null;
          
          // Method 1: Look for specific date components in dedicated elements
          const dateBox = $element.find(".summary-thumbnail-event-date, .event-date");
          if (dateBox.length) {
            const month = dateBox.find(".summary-thumbnail-event-date-month, .month").text().trim();
            const day = dateBox.find(".summary-thumbnail-event-date-day, .day").text().trim();
            
            if (month && day) {
              const parsedDate = parseEventDate(`${month} ${day}`, logger, 'Fox Cabaret');
              if (parsedDate) eventDate = parsedDate;
            }
          }
          
          // Method 2: Look for a formatted date string
          if (!eventDate) {
            const dateSelectors = [
              ".summary-metadata-item--date", ".eventlist-meta-date", ".date", ".event-date", ".datetime", 
              "[itemprop=startDate]", ".date-display", "time"
            ];
            
            for (const dateSelector of dateSelectors) {
              const dateElement = $element.find(dateSelector);
              if (dateElement.length) {
                const dateStr = dateElement.text().trim() || dateElement.attr("datetime") || dateElement.attr("content");
                if (dateStr) {
                  const parsedDate = parseEventDate(dateStr, logger, 'Fox Cabaret');
                  if (parsedDate) {
                    eventDate = parsedDate;
                    break;
                  }
                }
              }
            }
          }
          
          // Method 3: Look for data attributes that might contain date info
          if (!eventDate) {
            const dataDateAttr = $element.attr("data-date") || $element.find("[data-date]").attr("data-date");
            if (dataDateAttr) {
              const parsedDate = parseEventDate(dataDateAttr, logger, 'Fox Cabaret');
              if (parsedDate) eventDate = parsedDate;
            }
          }
          
          // Skip if no date found
          if (!eventDate) {
            logger.warn(`Skipping event "${title}" - couldn't extract date`);
            return;
          }
          
          // Extract image URL with multiple methods
          let imageUrl = '';
          
          // Method 1: Look for standard image elements
          const imgElements = $element.find("img");
          if (imgElements.length) {
            const img = imgElements.first();
            imageUrl = img.attr('data-src') || img.attr('src') || img.attr('data-image') || '';
            
            // Make URL absolute if needed
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = makeAbsoluteUrl(imageUrl, "https://www.foxcabaret.com");
            }
          }
          
          // Method 2: Look for background images in styles
          if (!imageUrl) {
            const elementsWithBg = $element.find("[style*='background-image']");
            if (elementsWithBg.length) {
              const style = elementsWithBg.first().attr('style') || '';
              const bgMatch = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/i);
              if (bgMatch && bgMatch[1]) {
                imageUrl = bgMatch[1].trim();
                
                // Make URL absolute if needed
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = makeAbsoluteUrl(imageUrl, "https://www.foxcabaret.com");
                }
              }
            }
          }
          
          // Default image if none found
          if (!imageUrl) {
            imageUrl = 'https://images.squarespace-cdn.com/content/v1/580168e0d2b857b4d19c523c/1605325686226-0LXMBGQPQGLDRJHBBE03/FoxNeon.jpg';
          }
          
          // Extract description
          let description = "";
          const descSelectors = [
            ".summary-excerpt", ".eventlist-description", ".description", "[itemprop=description]",
            ".event-description", ".details", ".content"
          ];
          
          for (const descSelector of descSelectors) {
            description = $element.find(descSelector).text().trim();
            if (description) break;
          }
          
          if (!description) {
            description = `${title} at Fox Cabaret in Vancouver. Join us for this exciting event in one of Vancouver's favorite intimate venues.`;
          }
          
          // Extract or create a URL for the event
          let eventUrl = '';
          const linkSelectors = [
            ".summary-title-link", ".eventlist-title-link", ".summary-read-more-link", "a.title", ".event-link",
            "a.event-title", ".more-info", ".tickets-link"
          ];
          
          for (const linkSelector of linkSelectors) {
            const linkEl = $element.find(linkSelector).first();
            if (linkEl.length) {
              const href = linkEl.attr('href');
              if (href) {
                eventUrl = href.startsWith('http') ? href : makeAbsoluteUrl(href, "https://www.foxcabaret.com");
                break;
              }
            }
          }
          
          // If no event URL found, try the element itself if it's a link
          if (!eventUrl && $element.is('a')) {
            const href = $element.attr('href');
            if (href) {
              eventUrl = href.startsWith('http') ? href : makeAbsoluteUrl(href, "https://www.foxcabaret.com");
            }
          }
          
          // If still no URL, use the source URL
          if (!eventUrl) {
            eventUrl = sourceUrl;
          }
          
          // Extract price information
          let price = 'Check website for ticket prices';
          const priceSelectors = [
            ".summary-price-list", ".eventlist-meta-item--price", ".price", "[itemprop=price]", ".ticket-price"
          ];
          
          for (const priceSelector of priceSelectors) {
            const priceText = $element.find(priceSelector).text().trim();
            if (priceText && priceText.includes('$')) {
              price = priceText;
              break;
            }
          }
          
          // Determine event categories and tags based on title and description
          const categories = ['music', 'nightlife', 'entertainment'];
          const tags = ['vancouver nightlife', 'live music', 'mount pleasant', 'fox cabaret'];
          
          // Add more specific categories based on content
          const lowerTitle = title.toLowerCase();
          const lowerDesc = description.toLowerCase();
          
          if (lowerTitle.includes('dj') || lowerDesc.includes('dj')) {
            categories.push('dance');
            tags.push('dj', 'electronic music');
          }
          
          if (lowerTitle.includes('comedy') || lowerDesc.includes('comedy')) {
            categories.push('comedy');
            tags.push('comedy show');
          }
          
          if (lowerTitle.includes('drag') || lowerDesc.includes('drag')) {
            categories.push('lgbt');
            tags.push('drag show', 'queer events');
          }
          
          // Determine season based on date
          const season = determineSeason(eventDate);
          
          // Create the event object in the final format
          events.push({
            title,
            date: eventDate,
            url: eventUrl,
            venue: {
              name: "Fox Cabaret",
              address: "3211 Main St",
              city: "Vancouver",
              state: "BC",
              country: "Canada",
              postalCode: "V5V 1A1"
            },
            location: {
              name: "Fox Cabaret",
              address: "3211 Main St",
              city: "Vancouver",
              state: "BC",
              country: "Canada",
              postalCode: "V5V 1A1"
            },
            description,
            imageUrl,
            price,
            categories,
            tags,
            season
          });
          
          logger.info(`Added event: ${title} on ${eventDate.toDateString()}`);
        } catch (error) {
          logger.error(`Error extracting Fox Cabaret event: ${error.message}`);
        }
      });
      
      // If we found events with this selector, no need to try other selectors
      if (events.length > 0) {
        break;
      }
    }
  }
  
  // If no events found with specific selectors, try a more generic approach
  if (events.length === 0) {
    logger.info("Trying generic extraction approach for Fox Cabaret events");
    
    // Look for any elements that might contain event information based on common patterns
    $('div, article, section, li').each((i, element) => {
      try {
        const $element = $(element);
        const elementText = $element.text().trim();
        
        // Skip elements with too little or too much text
        if (elementText.length < 20 || elementText.length > 2000) return;
        
        // Skip already processed elements
        if ($element.attr('data-processed')) return;
        $element.attr('data-processed', 'true');
        
        // Check for evidence this might be an event
        const hasDate = elementText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i) || 
                      elementText.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i) ||
                      elementText.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
        
        const hasTimePattern = elementText.match(/\b\d{1,2}:\d{2}\b/) || elementText.match(/\b\d{1,2}(am|pm)\b/i);
        const hasPricePattern = elementText.match(/\$\d+/) || elementText.match(/tickets/i);
        
        // Skip if there's no evidence of date/time/price
        if (!hasDate && !hasTimePattern && !hasPricePattern) return;
        
        // Extract title - look for header elements or capitalized text patterns
        const headerText = $element.find('h1, h2, h3, h4, strong, b').first().text().trim();
        const title = headerText || elementText.split('\n')[0].trim();
        
        if (!title || title.length < 3) return;
        
        // Try to find date information
        let eventDate = null;
        
        // Try parsing entire text for date patterns
        eventDate = parseEventDate(elementText, logger, 'Fox Cabaret');
        
        if (!eventDate) return;
        
        // Create a basic event
        events.push({
          title: title,
          date: eventDate,
          url: sourceUrl,
          venue: venue.name,
          location: {
            name: venue.name,
            address: venue.address,
            city: venue.city,
            province: venue.state,
            country: venue.country,
            postalCode: venue.postalCode
          },
          description: elementText.substring(0, 300) + '...',
          imageUrl: 'https://images.squarespace-cdn.com/content/v1/580168e0d2b857b4d19c523c/1605325686226-0LXMBGQPQGLDRJHBBE03/FoxNeon.jpg',
          price: hasPricePattern ? elementText.match(/\$\d+/)[0] : 'Check website for ticket prices',
          categories: ['music', 'nightlife', 'entertainment'],
          tags: ['vancouver nightlife', 'live music', 'mount pleasant', 'fox cabaret'],
          season: determineSeason(eventDate)
        });
        
        logger.info(`Added event using generic extraction: ${title} on ${eventDate.toDateString()}`);
      } catch (error) {
        // Silently skip problematic elements in generic extraction
      }
    });
  }
  
  logger.info(`Extracted ${events.length} events from Fox Cabaret HTML`);
  return events;
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
 * Scrape Fox Cabaret website for events using multiple techniques
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Fox Cabaret' });
  logger.info("Starting robust Fox Cabaret scraper");
  
  // Define the venue data once for reuse
  const venue = {
    name: "Fox Cabaret",
    address: "2321 Main St",
    city: "Vancouver",
    state: "BC",
    country: "Canada",
    postalCode: "V5T 3C9",
    website: "https://www.foxcabaret.com"
  };
  
  // Fox Cabaret URLs
  const urls = [
    "https://www.foxcabaret.com/monthly-calendar",
    "https://www.foxcabaret.com",
    "https://www.foxcabaret.com/events"
  ];
  
  try {
    // ==== Technique 1: Enhanced Axios with modern headers ====
    logger.info("Attempt 1: Using Axios with enhanced headers");
    
    // Try each URL to find events
    for (const url of urls) {
      logger.info(`Trying URL: ${url} with enhanced headers`);
      
      try {
        // Use enhanced headers that mimic modern browsers
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Sec-Ch-Ua': '" Not A;Brand";v="99", "Chromium";v="98"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 15000,
          validateStatus: status => status < 500
        });
        
        if (response.status === 200) {
          // Parse the HTML with cheerio
          const $ = cheerio.load(response.data);
          logger.info(`Successfully loaded ${url} with Axios`);
          
          // Extract events with various selectors
          const eventsFromPage = extractEvents($, url, venue, logger);
          
          if (eventsFromPage && eventsFromPage.length > 0) {
            logger.info(`Found ${eventsFromPage.length} events from ${url} using enhanced Axios`);
            return eventsFromPage;
          }
          
          logger.info(`No events found at ${url} with enhanced Axios`);
        } else {
          logger.warn(`Axios request to ${url} failed with status ${response.status}`);
        }
      } catch (axiosError) {
        logger.warn(`Axios error for ${url}: ${axiosError.message}`);
      }
    }
      
    // ==== Technique 2: Puppeteer with stealth plugin ====
    logger.info("Attempt 2: Using Puppeteer with stealth plugin");
    
    try {
      // Launch Puppeteer browser with stealth mode
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
      
      // Try each URL with Puppeteer
      for (const url of urls) {
        try {
          logger.info(`Trying URL: ${url} with Puppeteer`);
          
          // Create a new page with randomized user agent
          const page = await browser.newPage();
          
          // Set a random user agent
          const userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/98.0.4758.85 Mobile/15E148 Safari/604.1'
          ];
          const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
          await page.setUserAgent(randomUserAgent);
          
          // Set viewport to appear as a normal browser
          await page.setViewport({
            width: 1280 + Math.floor(Math.random() * 100),
            height: 960 + Math.floor(Math.random() * 100),
            deviceScaleFactor: 1,
            hasTouch: false,
            isLandscape: true,
            isMobile: false
          });
          
          // Add extra headers to appear more like a real browser
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
          });
          
          // Navigate to the site with a realistic timeout
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Auto-scroll to load any lazy content
          await autoScroll(page);
          
          // Wait a bit for any remaining dynamic content
          await page.waitForTimeout(2000);
          
          // Get the final HTML and extract events
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
          
          logger.info(`No events found at ${url} with Puppeteer`);
        } catch (pageError) {
          logger.warn(`Puppeteer error for ${url}: ${pageError.message}`);
        }
      }
      
      await browser.close();
    } catch (puppeteerError) {
      logger.warn(`Error launching Puppeteer: ${puppeteerError.message}`);
    }
    
    // ==== Technique 3: Alternative URL structure with mobile user agent ====
    logger.info("Attempt 3: Using alternative URL with mobile user agent");
    
    try {
      // Try alternative paths that might contain events
      const alternativeUrls = [
        "https://www.foxcabaret.com/shows",
        "https://www.foxcabaret.com/calendar",
        "https://www.foxcabaret.com/upcoming-shows"
      ];
      
      for (const altUrl of alternativeUrls) {
        try {
          logger.info(`Trying alternative URL: ${altUrl}`);
          
          const response = await axios.get(altUrl, {
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
            const alternativeEvents = extractEvents($, altUrl, venue, logger, true); // true for alternative URL
            
            if (alternativeEvents && alternativeEvents.length > 0) {
              logger.info(`Found ${alternativeEvents.length} events from alternative URL ${altUrl}`);
              return alternativeEvents;
            } else {
              logger.info(`No events found at alternative URL ${altUrl}`);
            }
          }
        } catch (altError) {
          logger.warn(`Error with alternative URL ${altUrl}: ${altError.message}`);
        }
      }
    } catch (error) {
      logger.warn(`Error in alternative URL technique: ${error.message}`);
    }
    
    // If all techniques fail, return an empty array
    logger.error("All Fox Cabaret scraping techniques failed");
    return [];
  } catch (error) {
    // Log the error and return an empty array
    logger.error(`Fatal error in Fox Cabaret scraper: ${error.message}`);
    return [];
  }
}

module.exports = {
  name: "Fox Cabaret",
  url: "https://www.foxcabaret.com/monthly-calendar",
  urls: ["https://www.foxcabaret.com/monthly-calendar", "https://www.foxcabaret.com", "https://www.foxcabaret.com/events"],
  scrape,
  // parseEventDate and determineSeason are now imported from centralized utility
  isUpcomingEvent,
  makeAbsoluteUrl,
  autoScroll,
  extractEvents
};
