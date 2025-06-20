/**
 * Scraper for Celebrities Nightclub venue website
 * Extracts event information from https://www.celebritiesnightclub.com/
 * Last updated: June 17, 2025 - Removed all fallbacks and placeholder events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { scrapeLogger } = require('../utils/logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - The date string to parse
 * @param {Object} [customLogger] - Optional logger object for tracing
 * @returns {Date|null} Parsed date object or null if parsing fails
 */
function parseEventDate(dateString, customLogger = null) {
  // Initialize logger with specific function and venue context
  const logger = customLogger || scrapeLogger.child({ function: 'parseEventDate', venue: 'Celebrities Nightclub' });
  
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
    const altMatch = dateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?\b/i);
    if (altMatch) {
      const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        .indexOf(altMatch[1].toLowerCase().substring(0, 3));
      const day = parseInt(altMatch[2]);
      const year = altMatch[3] ? parseInt(altMatch[3]) : currentYear;
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
    
    // Format: MM/DD/YYYY or MM-DD-YYYY (with or without year)
    const numericMatch = dateStr.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{4}))?/);
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
    
    // Special keywords already handled above
    
    // Handle date ranges by taking first date (e.g., "Jan 5 - Jan 7, 2025")
    const dateRangeMatch = dateStr.match(/^([^-]+)\s*-/);
    if (dateRangeMatch && dateRangeMatch[1]) {
      const firstDateStr = dateRangeMatch[1].trim();
      logger.debug(`Attempting to parse first date from range: ${firstDateStr}`);
      return parseEventDate(firstDateStr, logger); // Recursive call with first part of range
    }
    
    logger.warn(`Could not parse Celebrities Nightclub date: "${dateStr}"`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing Celebrities Nightclub date: "${dateString}"`);
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
 * Scrape Celebrities Nightclub website for events
 * @returns {Promise<Array>} Array of event objects
 */
async function scrape() {
  const logger = scrapeLogger.child({ scraper: 'Celebrities Nightclub' });
  logger.info("Starting Celebrities Nightclub scraper...");
  const events = [];
  const venueUrl = "https://www.celebritiesnightclub.com/";
  
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
    
    // Updated selectors based on the actual site structure
    // Look for the "UPCOMING EVENTS" section and find event containers
    logger.info('Looking for events in the UPCOMING EVENTS section');
    
    // First try - look for specific event cards that match the site structure
    let eventElements = $('.event-card, div[class*="event"]');
    
    // Second try - look for any elements that might contain event information
    if (eventElements.length === 0) {
      logger.info('No events found with first selector, trying alternative approach');
      eventElements = $('a').filter(function() {
        // Look for elements with dates that match event format (JUN, JUL, etc.)
        const text = $(this).text();
        return /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\b/i.test(text);
      }).parent();
    }
    
    // Third try - specifically target structure seen in screenshots
    if (eventElements.length === 0) {
      logger.info('Still no events found, trying specific site structure selector');
      // This targets the structure in the screenshot where each event has a container
      eventElements = $('body').find('div').filter(function() {
        // Find divs that have both images and date-like text
        return $(this).find('img').length > 0 && 
               $(this).text().match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}\b/i);
      });
    }
    
    logger.info(`Found ${eventElements.length} potential events at Celebrities Nightclub`);
    
    // No fallback events - if no events found, return empty array
    if (eventElements.length === 0) {
      logger.warn('No events found on Celebrities Nightclub website');
      return [];
    }
    
    // Process each event found
    eventElements.each((i, element) => {
      try {
        const $element = $(element);
        logger.info(`Processing event element ${i+1}`);
        
        // Extract the full text content to analyze
        const fullText = $element.text().trim();
        logger.debug(`Event element text: ${fullText}`);
        
        // Extract image if available
        const imageElement = $element.find("img").first();
        
        // First try standard selectors
        let title = '';
        let dateText = '';
        
        // Try to find title - look for any heading element first
        const titleElement = $element.find(".event-title, .title, h1, h2, h3, h4").first();
        if (titleElement.length) {
          title = titleElement.text().trim();
        }
        
        // Try to find date - look for date class first
        const dateElement = $element.find(".event-date, .date").first();
        if (dateElement.length) {
          dateText = dateElement.text().trim();
        }
        
        // If standard selectors failed, try to extract from the text content
        if (!title || !dateText) {
          // Look for month abbreviations followed by day
          const dateMatch = fullText.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})\b/i);
          
          if (dateMatch) {
            const monthAbbr = dateMatch[1].toUpperCase();
            const day = dateMatch[2];
            dateText = `${monthAbbr} ${day} ${new Date().getFullYear()}`;
            
            // The title could be everything before or after the date
            const parts = fullText.split(dateMatch[0]);
            if (parts.length > 1) {
              // Try to find the title part
              const cleanParts = parts.map(p => p.trim().replace(/\s+/g, ' '));
              // Choose the part that seems most like a title (longer than 3 chars, not just numbers)
              title = cleanParts.find(p => p.length > 3 && !/^\d+$/.test(p)) || '';
            }
          }
        }
        
        // If still no title, try looking for patterns in the element content
        if (!title) {
          // Try to extract title by looking for "presents" pattern common in event names
          const titleMatch = fullText.match(/([\w\s]+)\s+presents\s+([\w\s]+)/i);
          if (titleMatch) {
            title = titleMatch[0].trim();
          }
        }
        
        // Last resort - check if the parent element or siblings have title-like text
        if (!title) {
          const parentText = $element.parent().text().trim();
          if (parentText !== fullText && parentText.length < 100) {
            title = parentText;
          }
        }
        
        // Cleanup title
        if (title) {
          title = title.replace(/\s+/g, ' ').trim();
        }
        
        if (!title) {
          logger.warn(`Could not extract title for event ${i+1}, skipping`);
          return;
        }
        
        const startDate = parseEventDate(dateText, logger);
        
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
            name: "Celebrities Nightclub",
            address: "1022 Davie St",
            city: "Vancouver",
            state: "BC",
            website: venueUrl
          },
          sourceURL: venueUrl,
          officialWebsite: venueUrl,
          imageURL,
          location: "1022 Davie St, Vancouver, BC",
          type: "Event",
          category: "Nightlife",
          season,
          status: "active",
          description: `${title} at Celebrities Nightclub in Vancouver.`
        };
        
        events.push(event);
      } catch (error) {
        console.error("Error processing Celebrities Nightclub event:", error);
      }
    });
    
    logger.info(`Successfully scraped ${events.length} events from Celebrities Nightclub`);
    return events;
  } catch (error) {
    logger.error({ error }, `Error scraping Celebrities Nightclub: ${error.message}`);
    
    // No fallback events - return empty array on error
    return [];
  }
}

module.exports = {
  name: "Celebrities Nightclub",
  url: "https://www.celebritiesnightclub.com/",
  urls: ["https://www.celebritiesnightclub.com/"],
  scrape
};
