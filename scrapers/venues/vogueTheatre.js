/**
 * Scraper for Vogue Theatre venue events
 * Extracts event information from AdmitONE ticketing platform
 * Last updated: June 17, 2025 - Updated to use AdmitONE as data source, removed all fallbacks
 * 
 * Note: The Vogue Theatre's main website (https://www.voguetheatre.com/) doesn't list events directly.
 * Instead, they use AdmitONE ticketing platform for their events.
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
  const log = logger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Vogue Theatre' });
  
  try {
    if (!dateString) {
      log.warn('No date string provided');
      return null;
    }
    
    const dateStr = dateString.trim();
    const currentYear = 2025; // Set current year explicitly
    
    log.debug(`Attempting to parse date: "${dateStr}"`);
    
    // Try standard date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // If date is valid but very old (before 2020), set it to current year
      if (date.getFullYear() < 2020) {
        date.setFullYear(currentYear);
        log.debug(`Adjusted old date to current year ${currentYear}: ${date.toISOString()}`);
      } else {
        log.debug(`Parsed with standard format: ${date.toISOString()}`);
      }
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
      log.debug(`Parsed with DD MMM [YYYY] format: ${parsedDate.toISOString()}, using year: ${year}`);
      return parsedDate;
    }
    
    // Try formats like "MMM DD" or "MMM DD, Day" (e.g., "Jun 20, Fri")
    const monthDayMatch = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:\w*|,|\s+\w+)?\b/i);
    if (monthDayMatch) {
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(monthDayMatch[1].toLowerCase().substring(0, 3));
      const day = parseInt(monthDayMatch[2]);
      const parsedDate = new Date(currentYear, month, day);
      log.debug(`Parsed with MMM DD format: ${parsedDate.toISOString()}, using year: ${currentYear}`);
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
    
    log.warn(`Could not parse Vogue Theatre date: "${dateStr}"`);
    return null;
  } catch (error) {
    log.error({ error }, `Error parsing Vogue Theatre date: "${dateString}"`);
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
 * Scrape Vogue Theatre events from AdmitONE
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Vogue Theatre' });
  logger.info("Starting Vogue Theatre scraper...");
  
  const events = [];
  const venueUrl = "https://www.voguetheatre.com/";
  const admitOneVenueUrl = "https://admitone.com/venues/5f2c38d8b49c2246483017d7/vogue-theatre";
  
  try {
    // Get events from AdmitONE (their ticketing platform)
    logger.info(`Fetching events from AdmitONE: ${admitOneVenueUrl}`);
    const response = await axios.get(admitOneVenueUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find event links which are in "More Events at Vogue Theatre" section
    // They will be in format "Event Name" followed by a date
    const eventHeaders = $('h3').filter(function() {
      // Exclude venue names and other non-event headers
      const text = $(this).text().trim();
      return text && 
             text !== 'Vogue Theatre' && 
             !text.startsWith('More ') && 
             text !== 'Venue Info';
    });
    
    logger.info(`Found ${eventHeaders.length} potential events at AdmitONE`);
    
    for (let i = 0; i < eventHeaders.length; i++) {
      try {
        const eventHeader = $(eventHeaders[i]);
        const title = eventHeader.text().trim();
        
        // Date info is typically in the next text node after the header
        const dateText = eventHeader.next().text().trim();
        
        if (!title) {
          logger.warn('Event missing title, skipping');
          continue;
        }
        
        if (!dateText) {
          logger.warn(`Event "${title}" missing date, skipping`);
          continue;
        }
        
        // Parse date - format is usually "Jun 20, Fri - 6:00pm"
        const startDate = parseEventDate(dateText);
        
        if (!startDate) {
          logger.warn(`Failed to parse date for event "${title}" with date text "${dateText}", skipping`);
          continue;
        }
        
        // Get event URL by finding the nearest href link
        let eventUrl = '';
        const linkElements = eventHeader.parent().find('a');
        if (linkElements.length > 0) {
          eventUrl = 'https://admitone.com' + (linkElements.attr('href') || '');
        }
        
        // Get the venue location information which is in the next text node after the date
        const venueText = eventHeader.next().next().text().trim();
        
        const season = determineSeason(startDate);
        
        // Get image URL if available
        let imageURL = '';
        const imgElement = eventHeader.parent().find('img');
        if (imgElement.length > 0) {
          imageURL = imgElement.attr('src') || '';
          // Make sure it's a full URL
          if (imageURL && !imageURL.startsWith('http')) {
            imageURL = 'https://admitone.com' + imageURL;
          }
        }
        
        // Construct event object
        const event = {
          title,
          startDate,
          endDate: null,
          venue: {
            name: "Vogue Theatre",
            address: "918 Granville St",
            city: "Vancouver",
            state: "BC",
            website: venueUrl
          },
          sourceURL: eventUrl || admitOneVenueUrl,
          officialWebsite: venueUrl,
          imageURL,
          location: "918 Granville St, Vancouver, BC",
          type: "Event",
          category: "Entertainment",
          season,
          status: "active",
          description: `${title} at Vogue Theatre in Vancouver on ${dateText}.`
        };
        
        events.push(event);
        logger.info(`Added event: ${title} on ${startDate.toISOString()}`);
        
      } catch (error) {
        logger.error({ error }, `Error processing AdmitONE event: ${error.message}`);
      }
    }
    
    // Try getting event detail pages if we have URLs
    for (let i = 0; i < Math.min(events.length, 5); i++) {  // Limit to 5 events to avoid overloading
      const event = events[i];
      if (event.sourceURL && event.sourceURL.includes('/events/')) {
        try {
          logger.info(`Fetching additional details from ${event.sourceURL}`);
          const detailResponse = await axios.get(event.sourceURL, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
          });
          
          const $detail = cheerio.load(detailResponse.data);
          
          // Try to get a better description
          const descriptionEl = $detail('.event-description, [data-testid="event-description"]');
          if (descriptionEl.length > 0 && descriptionEl.text().trim()) {
            event.description = descriptionEl.text().trim();
          }
          
          // Try to get a better image
          const detailImage = $detail('.event-image img, .event-hero-image img');
          if (detailImage.length > 0 && detailImage.attr('src')) {
            event.imageURL = detailImage.attr('src');
            if (!event.imageURL.startsWith('http')) {
              event.imageURL = 'https://admitone.com' + event.imageURL;
            }
          }
          
          // Try to get price information
          const priceEl = $detail('.ticket-price, .price-range');
          if (priceEl.length > 0 && priceEl.text().trim()) {
            event.price = priceEl.text().trim();
          }
          
          logger.info(`Enhanced details for event: ${event.title}`);
          
        } catch (detailError) {
          logger.warn({ error: detailError }, `Error fetching event details for ${event.sourceURL}: ${detailError.message}`);
        }
      }
    }
    
    logger.info(`Successfully scraped ${events.length} events from AdmitONE for Vogue Theatre`);
    return events;
    
  } catch (error) {
    logger.error({ error }, `Error scraping Vogue Theatre events: ${error.message}`);
    // No fallbacks - return empty array
    return [];
  }
}

module.exports = {
  name: "Vogue Theatre",
  url: "https://www.voguetheatre.com/",
  urls: ["https://www.voguetheatre.com/"],
  scrape
};
