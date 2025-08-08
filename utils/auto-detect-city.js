/**
 * AUTO-DETECT CITY FROM SCRAPER FOLDER PATH
 * Brilliant approach: folder name = city name
 * No manual configuration needed!
 */

const path = require('path');

/**
 * Automatically detect city name from scraper file path
 * @param {string} filePath - Path to the scraper file (use __filename)
 * @returns {string} - City name extracted from folder structure
 */
function detectCityFromPath(filePath = __filename) {
  try {
    // Normalize the path
    const normalizedPath = path.resolve(filePath);
    
    // Split path into parts
    const pathParts = normalizedPath.split(path.sep);
    
    // Find 'cities' folder index
    const citiesIndex = pathParts.findIndex(part => part === 'cities');
    
    if (citiesIndex === -1 || citiesIndex >= pathParts.length - 1) {
      console.warn('⚠️ Could not detect city from path:', filePath);
      return 'Unknown City';
    }
    
    // City name is the folder after 'cities'
    const cityName = pathParts[citiesIndex + 1];
    
    console.log(`🏙️ Auto-detected city: "${cityName}" from path`);
    return cityName;
    
  } catch (error) {
    console.error('❌ Error detecting city from path:', error);
    return 'Unknown City';
  }
}

/**
 * Add city name to venue.name automatically
 * @param {Object} event - Event object
 * @param {string} filePath - Scraper file path (use __filename) 
 * @returns {Object} - Event with proper venue.name including city
 */
function addCityToVenueName(event, filePath = __filename) {
  const cityName = detectCityFromPath(filePath);
  
  // Ensure event has venue object
  if (!event.venue) {
    event.venue = {};
  }
  
  // Handle different venue formats
  if (typeof event.venue === 'string') {
    // Convert string venue to object
    const venueName = event.venue;
    event.venue = { name: venueName };
  }
  
  // Ensure venue.name exists
  if (!event.venue.name || event.venue.name.trim() === '') {
    // Extract venue name from various sources
    event.venue.name = extractVenueNameFromEvent(event) || `${cityName} Venue`;
  }
  
  // Add city to venue.name if not already present
  if (!event.venue.name.toLowerCase().includes(cityName.toLowerCase())) {
    event.venue.name = `${event.venue.name}, ${cityName}`;
  }
  
  return event;
}

/**
 * Extract venue name from various event fields
 * @param {Object} event - Event object
 * @returns {string} - Extracted venue name
 */
function extractVenueNameFromEvent(event) {
  // Try multiple sources
  if (event.venueName) return event.venueName;
  if (event.locationName) return event.locationName;
  if (event.location && event.location.includes(',')) {
    return event.location.split(',')[0].trim();
  }
  if (event.location) return event.location;
  
  return null;
}

/**
 * Process batch of events with automatic city detection
 * @param {Array} events - Array of event objects
 * @param {string} filePath - Scraper file path (use __filename)
 * @returns {Array} - Events with proper venue.name including city
 */
function processBatchWithCity(events, filePath = __filename) {
  const cityName = detectCityFromPath(filePath);
  
  console.log(`🔧 Processing ${events.length} events for ${cityName}...`);
  
  const processedEvents = events.map(event => addCityToVenueName(event, filePath));
  
  // Validate all events have venue.name
  const validEvents = processedEvents.filter(event => {
    const hasVenueName = event.venue && event.venue.name && event.venue.name.trim() !== '';
    if (!hasVenueName) {
      console.warn(`⚠️ Event "${event.title}" missing venue.name - will be invisible in app`);
    }
    return hasVenueName;
  });
  
  console.log(`✅ ${cityName}: ${validEvents.length}/${events.length} events with proper venue.name`);
  
  return validEvents;
}

module.exports = {
  detectCityFromPath,
  addCityToVenueName,
  processBatchWithCity
};
