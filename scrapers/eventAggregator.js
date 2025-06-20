/**
 * Event Aggregator
 * Aggregates events from all event scrapers
 * Last updated: June 16, 2025 - Strictly no fallbacks
 */

const fs = require('fs');
const path = require('path');
const { ScraperMonitor } = require('../utils/scraperMonitoring');
const { wrapScraper } = require('../utils/scraperWrapper');

/**
 * Finds all event scraper modules in a directory
 * @param {string} directory - Directory to search for scrapers
 * @returns {Array} - Array of scraper module objects
 */
async function findScrapers(directory) {
  try {
    const files = fs.readdirSync(directory);
    const scrapers = [];
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const scraperPath = path.join(directory, file);
        try {
          const scraper = require(scraperPath);
          if (scraper && typeof scraper.scrape === 'function') {
            scrapers.push({
              name: scraper.name || path.basename(file, '.js'),
              urls: scraper.urls || [scraper.url] || [],
              scrape: scraper.scrape,
              path: scraperPath
            });
          }
        } catch (error) {
          console.error(`Error loading scraper ${file}:`, error);
        }
      }
    }
    
    return scrapers;
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

/**
 * Runs all event scrapers and returns aggregated events
 * @returns {Promise<Array>} - Array of all events from all scrapers
 */
async function getAllEvents() {
  const eventsDir = path.join(__dirname, 'events');
  const venuesDir = path.join(__dirname, 'venues');
  const sourcesDir = path.join(__dirname, 'sources');
  
  // Find all scrapers
  const eventScrapers = await findScrapers(eventsDir);
  const venueScrapers = await findScrapers(venuesDir);
  const sourceScrapers = await findScrapers(sourcesDir);
  
  const allScrapers = [...eventScrapers, ...venueScrapers, ...sourceScrapers];
  
  console.log(`Found ${allScrapers.length} scrapers: ${eventScrapers.length} event, ${venueScrapers.length} venue, and ${sourceScrapers.length} source scrapers`);
  
  // Initialize scraper monitoring
  const monitor = new ScraperMonitor({
    alertThreshold: 3, // Alert after 3 consecutive zero-event runs
    historySize: 10,   // Keep history of the last 10 runs
  });
  
  // Wrap all scrapers with validation to enforce no-fallback rule
  const wrappedScrapers = allScrapers.map(scraper => ({
    ...scraper,
    scrape: wrapScraper(scraper.scrape, scraper.name)
  }));
  
  const allEvents = [];
  
  // Run all scrapers
  for (const scraper of wrappedScrapers) {
    try {
      console.log(`Running ${scraper.name} scraper...`);
      const startTime = Date.now();
      
      // Run the scraper with monitoring
      const events = await monitor.runScraper(scraper.name, scraper.scrape);
      
      const duration = Date.now() - startTime;
      
      if (events.length === 0) {
        console.warn(`⚠️ ${scraper.name} returned no events in ${duration}ms`);
      } else {
        console.log(`✅ ${scraper.name} returned ${events.length} events in ${duration}ms`);
      }
      
      allEvents.push(...events);
    } catch (error) {
      console.error(`Error running ${scraper.name} scraper:`, error);
    }
  }
  
  // Deduplicate events based on title + date
  const uniqueEvents = dedupEvents(allEvents);
  
  console.log(`Aggregated ${allEvents.length} events, ${uniqueEvents.length} unique events after deduplication`);
  
  return uniqueEvents;
}

/**
 * Deduplicate events based on title and date
 * @param {Array} events - Array of events
 * @returns {Array} - Array of deduplicated events
 */
function dedupEvents(events) {
  const uniqueMap = new Map();
  
  for (const event of events) {
    // Skip events without title or date
    if (!event.title || !event.startDate) continue;
    
    // Create a unique key for this event
    const startDateString = event.startDate instanceof Date ? 
      event.startDate.toISOString().split('T')[0] : // Use YYYY-MM-DD format
      'unknown-date';
    
    const key = `${event.title.toLowerCase().trim()}_${startDateString}`;
    
    // Only add if we haven't seen this key before
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, event);
    }
  }
  
  return Array.from(uniqueMap.values());
}

/**
 * Runs all event scrapers and returns events matching a filter
 * @param {Function} filterFn - Filter function that takes an event and returns boolean
 * @returns {Promise<Array>} - Array of filtered events
 */
async function getFilteredEvents(filterFn) {
  const allEvents = await getAllEvents();
  return allEvents.filter(filterFn);
}

/**
 * Gets events for a specific season (spring, summer, fall, winter, or all)
 * @param {string} season - Season to filter by
 * @returns {Promise<Array>} - Array of events for the specified season
 */
async function getEventsBySeason(season) {
  return getFilteredEvents(event => {
    if (season === 'all') return true;
    return event.season === season;
  });
}

/**
 * Gets events for a specific category
 * @param {string} category - Category to filter by
 * @returns {Promise<Array>} - Array of events for the specified category
 */
async function getEventsByCategory(category) {
  return getFilteredEvents(event => {
    if (!category) return true;
    return event.category && event.category.toLowerCase() === category.toLowerCase();
  });
}

/**
 * Gets events for a specific venue or location
 * @param {string} venue - Venue or location to filter by
 * @returns {Promise<Array>} - Array of events for the specified venue
 */
async function getEventsByVenue(venue) {
  return getFilteredEvents(event => {
    if (!venue) return true;
    
    const venueLower = venue.toLowerCase();
    
    // Check venue name
    if (event.venue && event.venue.name && 
        event.venue.name.toLowerCase().includes(venueLower)) {
      return true;
    }
    
    // Check location
    if (event.location && event.location.toLowerCase().includes(venueLower)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Gets events for a specific date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of events within the date range
 */
async function getEventsByDateRange(startDate, endDate) {
  return getFilteredEvents(event => {
    if (!event.startDate) return false;
    
    const eventDate = new Date(event.startDate);
    
    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;
    
    return true;
  });
}

/**
 * Gets events matching a search query
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of events matching the search query
 */
async function searchEvents(query) {
  if (!query) return getAllEvents();
  
  const queryLower = query.toLowerCase();
  
  return getFilteredEvents(event => {
    // Check title
    if (event.title && event.title.toLowerCase().includes(queryLower)) return true;
    
    // Check description
    if (event.description && event.description.toLowerCase().includes(queryLower)) return true;
    
    // Check venue name
    if (event.venue && event.venue.name && 
        event.venue.name.toLowerCase().includes(queryLower)) return true;
    
    // Check location
    if (event.location && event.location.toLowerCase().includes(queryLower)) return true;
    
    // Check category
    if (event.category && event.category.toLowerCase().includes(queryLower)) return true;
    
    return false;
  });
}

module.exports = {
  getAllEvents,
  getEventsBySeason,
  getEventsByCategory,
  getEventsByVenue,
  getEventsByDateRange,
  searchEvents
};
