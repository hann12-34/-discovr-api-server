/**
 * Date Parsing Utilities for Venue Scrapers
 * Provides standardized date parsing functions for all venue scrapers
 */
const { scrapeLogger } = require('./logger');

/**
 * Parse date string in various formats
 * @param {string} dateString - Date string to parse
 * @param {Object} [customLogger] - Optional logger object for tracing
 * @param {string} [venueName='Unknown Venue'] - Name of the venue for logging context
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseEventDate(dateString, customLogger = null, venueName = 'Unknown Venue') {
  // Initialize logger with specific function and venue context
  const logger = customLogger || scrapeLogger.child({ function: 'parseEventDate', venue: venueName });
  
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
    
    // Handle date ranges by taking first date (e.g., "Jan 5 - Jan 7, 2025")
    const dateRangeMatch = dateStr.match(/^([^-]+)\s*-/);
    if (dateRangeMatch && dateRangeMatch[1]) {
      const firstDatePart = dateRangeMatch[1].trim();
      logger.debug(`Attempting to parse first part of date range: ${firstDatePart}`);
      return parseEventDate(firstDatePart, logger, venueName); // Recursive call with first part and logger
    }
    
    logger.warn(`Could not parse ${venueName} date: "${dateStr}"`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing ${venueName} date: "${dateString}"`);
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

module.exports = {
  parseEventDate,
  determineSeason
};
