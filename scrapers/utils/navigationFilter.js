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
  
  // List of ONLY obvious navigation/menu/UI terms - much more conservative filtering
  const navigationTerms = [
    // Clear Navigation Items Only
    'main menu', 'navigation menu', 'nav menu', 'header menu', 'submenu',
    'events list navigation', 'events navigation', 'event navigation', 'list navigation',
    'events search and views navigation', 'search and views navigation',
    
    // Clear UI Controls Only
    'load more', 'show more', 'view all', 'see all', 'read more', 'continue reading',
    'previous', 'next', 'back', 'return', 'close', 'cancel', 'submit', 'save',
    'search results', 'no results', 'loading', 'please wait',
    
    // Obvious Non-Events Only
    'login', 'register', 'sign up', 'sign in', 'privacy policy', 'terms of service',
    'test event', 'sample event', 'demo event', 'placeholder', 'example event',
    'system message', 'error message', 'debug', 'test data', 'sample data',
    
    // Website Structure Elements Only
    'header', 'footer', 'sidebar', 'banner', 'breadcrumb', 'pagination'
  ];
  
  // Check if title is too short or is just a single word (likely a header/navigation)
  if (title.length < 5 || (!title.includes(' ') && title.length < 8)) {
    return true;
  }
  
  // Filter out titles that are exactly obvious non-event terms only
  if (lowerTitle === 'menu' || 
      lowerTitle === 'search' ||
      lowerTitle === 'home' ||
      lowerTitle === 'login' ||
      lowerTitle === 'filters') {
    return true;
  }
  
  // Return true if the title contains any navigation terms
  return navigationTerms.some(term => lowerTitle.includes(term));
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
