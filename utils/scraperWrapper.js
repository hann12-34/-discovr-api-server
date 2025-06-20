/**
 * Scraper Wrapper Utility
 * 
 * This utility wraps venue scrapers with monitoring functionality.
 * It ensures that no fallbacks are used and that proper monitoring occurs.
 * 
 * Last updated: June 16, 2025
 */

const { monitorScraper } = require('./scraperMonitoring');

/**
 * Wraps a scraper function with validation and monitoring
 * @param {Function} scraperFunc - The original scraper function
 * @param {String} scraperName - Name of the scraper
 * @returns {Function} - Wrapped scraper function
 */
function wrapScraper(scraperFunc, scraperName) {
  // First apply monitoring
  const monitoredScraper = monitorScraper(scraperFunc, scraperName);
  
  // Then apply no-fallback validation
  return async function validatedScraper(...args) {
    const events = await monitoredScraper(...args);
    
    // Ensure we have an array
    if (!Array.isArray(events)) {
      throw new Error(`Scraper ${scraperName} didn't return an array of events`);
    }
    
    // Validate for no fallbacks
    const validEvents = validateNoFallbacks(events, scraperName);
    
    return validEvents;
  };
}

/**
 * Validates that events are not fallbacks
 * @param {Array} events - Array of event objects
 * @param {String} scraperName - Name of the scraper for logging
 * @returns {Array} - Filtered array with fallbacks removed
 */
function validateNoFallbacks(events, scraperName) {
  const originalCount = events.length;
  
  const validEvents = events.filter(event => {
    // Skip events with null dates (common in fallbacks)
    if (!event.startDate) {
      console.warn(`[${scraperName}] Filtering out event with null startDate: ${event.title}`);
      return false;
    }
    
    // Skip events with generic titles that indicate fallbacks
    if (event.title.startsWith('Visit ') || 
        event.title.includes('Check website') ||
        event.title.toLowerCase().includes('fallback')) {
      console.warn(`[${scraperName}] Filtering out likely fallback event: ${event.title}`);
      return false;
    }
    
    // Skip events with type "Venue" instead of "Event" (often indicates a fallback)
    if (event.type === 'Venue') {
      console.warn(`[${scraperName}] Filtering out venue type event: ${event.title}`);
      return false;
    }
    
    // Additional check for very generic descriptions
    const genericPhrases = [
      'check their website',
      'check the website',
      'visit for more information'
    ];
    
    if (event.description && 
        genericPhrases.some(phrase => event.description.toLowerCase().includes(phrase))) {
      console.warn(`[${scraperName}] Filtering out event with generic description: ${event.title}`);
      return false;
    }
    
    return true;
  });
  
  // Log if we filtered out any events
  if (validEvents.length < originalCount) {
    console.warn(`[${scraperName}] Filtered out ${originalCount - validEvents.length} fallback events`);
  }
  
  return validEvents;
}

module.exports = {
  wrapScraper,
  validateNoFallbacks
};
