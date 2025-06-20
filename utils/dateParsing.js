/**
 * Date parsing utility functions
 * Handles various date formats and provides fallbacks
 */

const { scrapeLogger } = require('../scrapers/utils/logger');

/**
 * Parse event date from various formats
 * @param {string} dateString - Raw date string
 * @param {Object} logger - Logger instance
 * @param {string} venue - Venue name for logging
 * @returns {Date|null} Parsed date or null if parsing fails
 */
function parseEventDate(dateString, customLogger = null, venue = 'Unknown Venue') {
  const logger = customLogger || scrapeLogger.child({ function: 'parseEventDate', venue });
  try {
    if (!dateString) {
      logger.warn('No date string provided');
      return null;
    }

    // Normalize whitespace
    const normalized = dateString.trim().toLowerCase();

    // Handle special keywords
    if (['tba', 'to be announced', 'pending', 'coming soon'].includes(normalized)) {
      logger.debug('Date marked as TBA');
      return null;
    }

    // Try various date formats
    const dateFormats = [
      // YYYY-MM-DD
      /\b(\d{4})-(\d{2})-(\d{2})\b/, // 2025-06-19
      // MM/DD/YYYY
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, // 06/19/2025
      // DD/MM/YYYY
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, // 19/06/2025
      // Month DD, YYYY
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),\s+(\d{4})\b/i, // June 19, 2025
      // DD Month YYYY
      /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})\b/i, // 19 June 2025
      // Month DD
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/i, // June 19
      // DD Month
      /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i // 19 June
    ];

    // Try each format
    for (const format of dateFormats) {
      const match = format.exec(normalized);
      if (match) {
        try {
          // Parse based on matched format
          if (format === dateFormats[0]) { // YYYY-MM-DD
            return new Date(match[1], parseInt(match[2]) - 1, parseInt(match[3]));
          } else if (format === dateFormats[1] || format === dateFormats[2]) { // MM/DD/YYYY or DD/MM/YYYY
            const month = format === dateFormats[1] ? parseInt(match[1]) : parseInt(match[2]);
            const day = format === dateFormats[1] ? parseInt(match[2]) : parseInt(match[1]);
            return new Date(match[3], month - 1, day);
          } else if (format === dateFormats[3] || format === dateFormats[4]) { // Month DD, YYYY or DD Month YYYY
            const month = match[1].toLowerCase();
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            return new Date(year, new Date(`2025-${month}-01`).getMonth(), day);
          } else if (format === dateFormats[5] || format === dateFormats[6]) { // Month DD or DD Month
            const month = match[1].toLowerCase();
            const day = parseInt(match[2]);
            // Use default year 2025 for partial dates
            return new Date(2025, new Date(`2025-${month}-01`).getMonth(), day);
          }
        } catch (parseError) {
          logger.warn(`Error parsing date format: ${parseError.message}`);
        }
      }
    }

    // If no format matched, try default parsing
    try {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      logger.warn(`Default date parsing failed: ${error.message}`);
    }

    // If we have a partial date (month/day), use default year 2025
    const partialMatch = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})?\b/i.exec(normalized);
    if (partialMatch) {
      try {
        const month = partialMatch[1].toLowerCase();
        const day = partialMatch[2] ? parseInt(partialMatch[2]) : 1;
        return new Date(2025, new Date(`2025-${month}-01`).getMonth(), day);
      } catch (error) {
        logger.warn(`Partial date parsing failed: ${error.message}`);
      }
    }

    // If we have a day number only, assume current month
    const dayMatch = /\b(\d{1,2})\b/.exec(normalized);
    if (dayMatch) {
      try {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), parseInt(dayMatch[1]));
      } catch (error) {
        logger.warn(`Day-only parsing failed: ${error.message}`);
      }
    }

    logger.debug(`No valid date format found in: "${dateString}"`);
    return null;
  } catch (error) {
    logger.error({ error }, `Error parsing ${venue} date: "${dateString}"`);
    return null;
  }
}

/**
 * Determine season based on date
 * @param {Date} date - Date to determine season for
 * @returns {string} Season name (spring, summer, fall, winter)
 */
function determineSeason(date) {
  if (!date) return null;
  
  const month = date.getMonth();
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

module.exports = {
  parseEventDate,
  determineSeason
};
