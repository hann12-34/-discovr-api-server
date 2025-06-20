/**
 * Scraper for The Cultch venue website
 * Extracts event information from https://thecultch.com/whats-on/
 * Last updated: June 17, 2025 - Removed all fallbacks and placeholder events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString) {
  const logger = scrapeLogger.child({ function: 'parseEventDate' });
  try {
    if (!dateString) return null;
    
    // Current year to use when no year is specified
    const currentYear = 2025;
    
    const dateStr = dateString.trim();
    logger.debug(`Attempting to parse date: ${dateStr}`);
    
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
    
    logger.warn(`Could not parse The Cultch date: ${dateStr}`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing The Cultch date: ${dateString}`);
    return null;
  }
}

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
 * Scrape The Cultch website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'The Cultch' });
  logger.info("Starting The Cultch scraper...");
  const events = [];
  const venueUrl = "https://thecultch.com/whats-on/";
  
  try {
    // Get the venue's HTML content
    const response = await axios.get(venueUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Find all events - try different selectors to maximize chances of finding events
    let eventElements = $(".show-listing, .event, .event-item");
    if (eventElements.length === 0) {
      eventElements = $(".event-listing, .show, [class*='event-'], .performances-list .item");
    }
    if (eventElements.length === 0) {
      eventElements = $("[data-type='event'], article, .performance-item, [class*='event']");
    }
    
    logger.info(`Found ${eventElements.length} potential events at The Cultch`);
    
    // No fallback events - if no events found, return empty array
    if (eventElements.length === 0) {
      logger.warn('No events found on The Cultch website');
      return [];
    }
    
    // Process each event found
    eventElements.each((i, element) => {
      try {
        const $element = $(element);
        const titleElement = $element.find(".event-title, .title, h1, h2, h3, h4").first();
        const dateElement = $element.find(".event-date, .date, .show-date, .show-dates").first();
        const imageElement = $element.find("img").first();
        
        // Get event title
        const title = titleElement.text().trim();
        if (!title) {
          logger.warn('Event missing title, skipping');
          return;
        }
        
        // Get event date
        const dateText = dateElement.text().trim();
        
        // Skip events without date information
        if (!dateText) {
          logger.warn(`Event "${title}" missing date information, skipping`);
          return;
        }
        
        const startDate = parseEventDate(dateText);
        
        // Skip events where date parsing failed
        if (!startDate) {
          logger.warn(`Failed to parse date for event "${title}" with date text "${dateText}", skipping`);
          return;
        }
        
        const season = determineSeason(startDate);
        
        // Get event image
        let imageURL = '';
        if (imageElement && imageElement.attr('src')) {
          imageURL = makeAbsoluteUrl(imageElement.attr('src'), venueUrl);
        }
        
        // Create event object
        const event = {
          title,
          startDate,
          endDate: null,
          venue: {
            name: "The Cultch",
            address: "1895 Venables St",
            city: "Vancouver",
            state: "BC",
            website: venueUrl
          },
          sourceURL: venueUrl,
          officialWebsite: venueUrl,
          imageURL,
          location: "1895 Venables St, Vancouver, BC",
          type: "Event",
          category: "Arts",
          season,
          status: "active",
          description: `${title} at The Cultch in Vancouver.`
        };
        
        events.push(event);
      } catch (error) {
        console.error("Error processing The Cultch event:", error);
      }
    });
    
    logger.info(`Successfully scraped ${events.length} events from The Cultch`);
    return events;
  } catch (error) {
    logger.error({ error }, `Error scraping The Cultch: ${error.message}`);
    
    // No fallback events - return empty array on error
    return [];
  }
}

module.exports = {
  name: "The Cultch",
  url: "https://thecultch.com/whats-on/",
  urls: ["https://thecultch.com/whats-on/"],
  scrape
};
