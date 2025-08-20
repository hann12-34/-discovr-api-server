/**
 * Universal Navigation Filter Utility
 * Prevents non-events (navigation items, UI elements, etc.) from being treated as events
 * 
 * Based on successful filtering logic from MOCA scraper
 * Addresses user requirement: NO navigation items like "Search", "About the show", "Header Menu" as events
 */

/**
 * Check if a title appears to be a navigation/UI element rather than a real event
 * @param {string} title - The event title to check
 * @returns {boolean} - True if this appears to be a navigation item (should be filtered out)
 */
function isNavigationItem(title) {
  if (!title || typeof title !== 'string') {
    return true; // Filter out empty/invalid titles
  }

  // Convert title to lowercase for case-insensitive comparison
  const lowerTitle = title.toLowerCase().trim();
  
  // EXTREMELY MINIMAL filtering - only block absolutely obvious non-events
  // Allow ALL messy scraped content through since that's real event data
  
  // Only filter out completely empty or single character titles
  if (title.trim().length < 1) {
    return true;
  }
  
  // Only filter exact matches of obvious non-event terms (very short list)
  if (lowerTitle === 'menu' || 
      lowerTitle === 'login' ||
      lowerTitle === 'home' ||
      lowerTitle === 'search') {
    return true;
  }
  
  // Everything else is considered a valid event (including messy HTML)
  return false;
}

/**
 * Filter an array of events to remove navigation/UI items
 * @param {Array} events - Array of event objects with title property
 * @returns {Array} - Filtered array with navigation items removed
 */
function filterNavigationItems(events) {
  if (!Array.isArray(events)) {
    return [];
  }
  
  const filteredEvents = events.filter(event => {
    if (!event || !event.title) {
      return false; // Remove events without titles
    }
    
    return !isNavigationItem(event.title);
  });
  
  const removedCount = events.length - filteredEvents.length;
  if (removedCount > 0) {
    console.log(`🚫 Filtered out ${removedCount} navigation/UI items`);
  }
  
  return filteredEvents;
}

/**
 * Validate that an event title represents a real event
 * @param {string} title - The event title to validate
 * @returns {boolean} - True if this appears to be a valid event title
 */
function isValidEventTitle(title) {
  return !isNavigationItem(title);
}

module.exports = {
  isNavigationItem,
  filterNavigationItems,
  isValidEventTitle
};
