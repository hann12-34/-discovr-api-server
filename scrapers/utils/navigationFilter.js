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
  
  // List of common navigation/menu/UI item terms that should NOT be events
  const navigationTerms = [
    // Navigation & Menu Items
    'learn more', 'events calendar', 'events & public', 'exhibitions', 'projects', 
    'doors open', 'menu', 'navigation', 'home', 'about', 'plan your visit', 
    'explore', 'donate', 'support', 'contact', 'search', 'press', 'accessibility',
    'membership', 'shop', 'calendar', 'programme', 'community', 'visit', 'school',
    'teacher', 'education', 'learn', 'youth council', 'main menu', 'submenu',
    
    // UI Elements & Controls
    'header menu', 'events list navigation', 'about the show', 'events navigation',
    'event navigation', 'list navigation', 'navigation menu', 'nav menu',
    'load more', 'show more', 'view all', 'see all', 'read more', 'continue reading',
    'previous', 'next', 'back', 'return', 'close', 'cancel', 'submit', 'save',
    'filter', 'sort', 'search results', 'no results', 'loading', 'please wait',
    
    // Generic Pages & Sections
    'gallery', 'photos', 'images', 'video', 'media', 'downloads', 'resources',
    'news', 'blog', 'articles', 'publications', 'newsletter', 'updates',
    'login', 'register', 'sign up', 'sign in', 'account', 'profile', 'settings',
    
    // Footer & Legal
    'privacy policy', 'terms of service', 'copyright', 'legal', 'disclaimer',
    'cookies', 'site map', 'sitemap', 'help', 'faq', 'frequently asked',
    
    // Social & Sharing
    'share', 'facebook', 'twitter', 'instagram', 'linkedin', 'youtube',
    'follow us', 'connect', 'social media', 'newsletter signup',
    
    // Common Non-Event Content
    'description', 'overview', 'summary', 'details', 'information', 'more info',
    'test event', 'sample event', 'demo event', 'placeholder', 'example event',
    'coming soon', 'tbd', 'to be determined', 'to be announced', 'tba',
    'system message', 'error message', 'debug', 'test data', 'sample data',
    'directions', 'parking', 'hours', 'admission', 'tickets', 'pricing',
    'facilities', 'amenities', 'services', 'staff', 'team', 'board',
    
    // Website Structure
    'header', 'footer', 'sidebar', 'banner', 'advertisement', 'sponsor',
    'breadcrumb', 'pagination', 'filter', 'sort', 'search results'
  ];
  
  // Check if title is too short or is just a single word (likely a header/navigation)
  if (title.length < 5 || (!title.includes(' ') && title.length < 8)) {
    return true;
  }
  
  // Filter out titles that are exactly common non-event terms
  if (lowerTitle === 'events' || 
      lowerTitle === 'exhibitions' || 
      lowerTitle === 'search' ||
      lowerTitle === 'about' ||
      lowerTitle === 'contact' ||
      lowerTitle === 'home' ||
      lowerTitle === 'menu') {
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
