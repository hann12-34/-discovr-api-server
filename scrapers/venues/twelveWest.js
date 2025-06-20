/**
 * Scraper for Twelve West venue website
 * Extracts event information from https://twelvewest.ca/collections/upcoming-events
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
  try {
    if (!dateString) return null;
    
    const dateStr = dateString.trim();
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try formats like "DD MMM YYYY"
    const dateMatch = dateStr.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(dateMatch[2].toLowerCase().substring(0, 3));
      const year = parseInt(dateMatch[3]);
      return new Date(year, month, day);
    }
    
    console.warn(`Could not parse Twelve West date: ${dateStr}`);
    return null;
  } catch (error) {
    console.error(`Error parsing Twelve West date: ${dateString}`, error);
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
 * Scrape Twelve West website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Twelve West' });
  logger.info("Starting Twelve West scraper...");
  const events = [];
  const venueUrl = "https://twelvewest.ca/collections/upcoming-events";
  
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
    let eventElements = $(".product, .product-card, .event-item, article");
    if (eventElements.length === 0) {
      eventElements = $(".collection-grid-item, .collection-product, .product-grid-item, [class*='product']");
    }
    if (eventElements.length === 0) {
      eventElements = $("[data-product-item], .grid__item, [class*='event'], .events-list .item");
    }
    
    logger.info(`Found ${eventElements.length} potential events at Twelve West`);
    
    // No fallback events - if no events found, return empty array
    if (eventElements.length === 0) {
      logger.warn('No events found on Twelve West website');
      return [];
    }
    
    // Process each event found
    eventElements.each((i, element) => {
      try {
        const $element = $(element);
        const titleElement = $element.find(".product-title, .title, h1, h2, h3").first();
        const dateElement = $element.find(".event-date, .date").first();
        const imageElement = $element.find("img").first();
        const priceElement = $element.find(".price, .product-price").first();
        
        // Get event title
        const title = titleElement.text().trim();
        if (!title) {
          logger.warn('Event missing title, skipping');
          return;
        }
        
        // Try to extract date from title or other fields
        let dateText = dateElement.text().trim();
        if (!dateText) {
          // Try to extract date from title (common format for club events)
          const datePart = title.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}|\d{4})\b/i);
          if (datePart) {
            dateText = datePart[0];
          }
        }
        
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
        
        // Get price if available
        let price = '';
        if (priceElement) {
          price = priceElement.text().trim();
        }
        
        // Create event object
        const event = {
          title,
          startDate,
          endDate: null,
          venue: {
            name: "Twelve West",
            address: "1222 Hamilton St",
            city: "Vancouver",
            state: "BC",
            website: venueUrl
          },
          sourceURL: venueUrl,
          officialWebsite: venueUrl,
          imageURL,
          price,
          location: "1222 Hamilton St, Vancouver, BC",
          type: "Event",
          category: "Nightlife",
          season,
          status: "active",
          description: `${title} at Twelve West in Vancouver.${price ? ' Price: ' + price : ''}`
        };
        
        events.push(event);
      } catch (error) {
        console.error("Error processing Twelve West event:", error);
      }
    });
    
    logger.info(`Successfully scraped ${events.length} events from Twelve West`);
    return events;
  } catch (error) {
    logger.error({ error }, `Error scraping Twelve West: ${error.message}`);
    
    // No fallback events - return empty array on error
    return [];
  }
}

module.exports = {
  name: "Twelve West",
  url: "https://twelvewest.ca/collections/upcoming-events",
  urls: ["https://twelvewest.ca/collections/upcoming-events"],
  scrape
};
