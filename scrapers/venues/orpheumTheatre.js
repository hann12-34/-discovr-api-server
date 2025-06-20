/**
 * Scraper for Orpheum Theatre venue website
 * Extracts event information from https://vancouvercivictheatres.com/venues/orpheum
 * Last updated: June 17, 2025 - Removed all fallbacks and placeholder events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @param {Object} [logger] - Optional logger object for tracing
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString, logger = null) {
  // Initialize logger if not provided
  const log = logger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Orpheum Theatre' });
  
  try {
    if (!dateString) {
      log.warn('No date string provided');
      return null;
    }
    
    // Current year to use when no year is specified
    const currentYear = 2025;
    
    const dateStr = dateString.trim();
    log.debug(`Attempting to parse date: "${dateStr}"`);
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      log.debug(`Parsed with standard format: ${date.toISOString()}`);
      return date;
    }
    
    // Try formats like "DD MMM YYYY"
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
    const numericMatch = dateStr.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?/);
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
    
    log.warn(`Could not parse Orpheum Theatre date: "${dateStr}"`);
    return null;
  } catch (error) {
    log.error({ error }, `Error parsing Orpheum Theatre date: "${dateString}"`);
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
 * Scrape Orpheum Theatre website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Orpheum Theatre' });
  logger.info("Starting Orpheum Theatre scraper...");
  const events = [];
  const venueUrl = "https://vancouvercivictheatres.com/venues/orpheum";
  
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
    
    // Find all events - the Vancouver Civic Theatres site lists events for multiple venues
    // so we need to filter for Orpheum specifically
    const allEventElements = $(".event, .event-listing, .event-grid article, .events-list .row");
    logger.info(`Found ${allEventElements.length} total events at Vancouver Civic Theatres`);
    
    // Array to store just Orpheum events
    const orpheumEvents = [];
    
    // Filter events for Orpheum Theatre
    allEventElements.each((i, element) => {
      const $element = $(element);
      const venueText = $element.find('.venue-name, .location, .venue').text().toLowerCase();
      
      // Only include events at the Orpheum
      if (venueText.includes('orpheum')) {
        orpheumEvents.push($element);
      }
    });
    
    logger.info(`Filtered ${orpheumEvents.length} events specifically for Orpheum Theatre`);
    
    // Process each Orpheum event found
    for (const $element of orpheumEvents) {
      try {
        const titleElement = $element.find(".event-title, .title, h1, h2, h3, .event-name").first();
        const dateElement = $element.find(".event-date, .date, .datetime").first();
        const imageElement = $element.find(".event-image img, img").first();
        
        // Get event title
        const title = titleElement.text().trim();
        if (!title) {
          logger.warn('Event missing title, skipping');
          continue;
        }
        
        // Get event date
        const dateText = dateElement.text().trim();
        if (!dateText) {
          logger.warn(`Event "${title}" missing date, skipping`);
          continue;
        }
        
        const startDate = parseEventDate(dateText);
        if (!startDate) {
          logger.warn(`Event "${title}" has invalid date format: "${dateText}", skipping`);
          continue;
        }
        
        const season = determineSeason(startDate);
        
        // Get event image
        let imageURL = '';
        if (imageElement && imageElement.attr('src')) {
          imageURL = makeAbsoluteUrl(imageElement.attr('src'), venueUrl);
        }
        
        // Attempt to get the event URL
        let eventUrl = '';
        const linkElement = $element.find('a').first();
        if (linkElement && linkElement.attr('href')) {
          eventUrl = makeAbsoluteUrl(linkElement.attr('href'), venueUrl);
        }
        
        // Try to extract more details like description
        let description = $element.find('.description, .event-description, .synopsis').text().trim();
        if (!description) {
          description = `${title} at Orpheum Theatre in Vancouver on ${dateText}.`;
        }
        
        // Create event object with validated data
        const event = {
          title,
          startDate,
          endDate: null,
          venue: {
            name: "Orpheum Theatre",
            address: "601 Smithe St",
            city: "Vancouver",
            state: "BC",
            website: venueUrl
          },
          sourceURL: eventUrl || venueUrl,
          officialWebsite: venueUrl,
          imageURL,
          location: "601 Smithe St, Vancouver, BC",
          type: "Event",
          category: "Entertainment",
          season,
          status: "active",
          description
        };
        
        events.push(event);
        logger.info(`Added event: ${title} on ${startDate.toISOString()}`);
      } catch (error) {
        logger.error({ error }, `Error processing Orpheum Theatre event: ${error.message}`);
      }
    }
    
    logger.info(`Successfully scraped ${events.length} events from Orpheum Theatre`);
    return events;
  } catch (error) {
    logger.error({ error }, `Error scraping Orpheum Theatre: ${error.message}`);
    
    // Return empty array instead of fallback event
    return [];
  }
}

module.exports = {
  name: "Orpheum Theatre",
  url: "https://vancouvercivictheatres.com/venues/orpheum",
  urls: ["https://vancouvercivictheatres.com/venues/orpheum"],
  scrape
};
