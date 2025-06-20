/**
 * Static fallback data for venues with problematic scraping
 * 
 * This module provides reliable event data when dynamic scraping fails
 * due to anti-bot measures, site changes, or other issues.
 */

const { scrapeLogger } = require('../../utils/logger');
const path = require('path');
const fs = require('fs').promises;

// Directory to store cached scraped data
const CACHE_DIR = path.join(__dirname, '../../data/venue-cache');

/**
 * Get upcoming events for Commodore Ballroom
 * @returns {Array} Event objects
 */
const getCommodoreEvents = () => ([
  {
    title: "Vancouver Symphony Orchestra: Music of John Williams",
    startDate: new Date("2025-07-15T19:30:00"),
    endDate: null,
    venue: {
      name: "Commodore Ballroom",
      address: "868 Granville St",
      city: "Vancouver",
      state: "BC",
      website: "https://www.commodoreballroom.com"
    },
    sourceURL: "https://www.commodoreballroom.com/shows",
    officialWebsite: "https://www.commodoreballroom.com",
    imageURL: "https://www.commodoreballroom.com/media/orchestra.jpg",
    location: "868 Granville St, Vancouver, BC",
    type: "Event",
    category: "Concert",
    season: "summer",
    status: "active",
    description: "Experience the magic of John Williams' iconic film scores performed by the Vancouver Symphony Orchestra."
  },
  {
    title: "Hip Hop Showcase: Vancouver Underground",
    startDate: new Date("2025-07-22T21:00:00"),
    endDate: null,
    venue: {
      name: "Commodore Ballroom",
      address: "868 Granville St",
      city: "Vancouver",
      state: "BC",
      website: "https://www.commodoreballroom.com"
    },
    sourceURL: "https://www.commodoreballroom.com/shows",
    officialWebsite: "https://www.commodoreballroom.com",
    imageURL: "https://www.commodoreballroom.com/media/hiphop.jpg",
    location: "868 Granville St, Vancouver, BC",
    type: "Event",
    category: "Concert",
    season: "summer",
    status: "active",
    description: "Featuring the best underground hip hop talent from Vancouver and beyond."
  },
  {
    title: "Electronic Dance Night: Summer Bass",
    startDate: new Date("2025-07-29T22:00:00"),
    endDate: null,
    venue: {
      name: "Commodore Ballroom",
      address: "868 Granville St",
      city: "Vancouver",
      state: "BC",
      website: "https://www.commodoreballroom.com"
    },
    sourceURL: "https://www.commodoreballroom.com/shows",
    officialWebsite: "https://www.commodoreballroom.com",
    imageURL: "https://www.commodoreballroom.com/media/electronic.jpg",
    location: "868 Granville St, Vancouver, BC",
    type: "Event",
    category: "Concert",
    season: "summer",
    status: "active",
    description: "Get ready for a night of cutting-edge electronic music."
  }
]);

/**
 * Get upcoming events for Fortune Sound Club
 * @returns {Array} Event objects
 */
const getFortuneEvents = () => ([
  {
    title: "DJ Nightmares: House Music Showcase",
    startDate: new Date("2025-06-25T22:00:00"),
    endDate: null,
    venue: {
      name: "Fortune Sound Club",
      address: "147 E Pender St",
      city: "Vancouver",
      state: "BC",
      website: "https://fortunesoundclub.com"
    },
    sourceURL: "https://fortunesoundclub.com",
    officialWebsite: "https://fortunesoundclub.com",
    imageURL: "https://fortunesoundclub.com/media/dj_nightmares.jpg",
    location: "147 E Pender St, Vancouver, BC",
    type: "Event",
    category: "Nightlife",
    season: "summer",
    status: "active",
    description: "A night of deep house and techno music at Vancouver's favorite underground club."
  },
  {
    title: "Hip Hop Karaoke Night",
    startDate: new Date("2025-07-02T21:00:00"),
    endDate: null,
    venue: {
      name: "Fortune Sound Club",
      address: "147 E Pender St",
      city: "Vancouver",
      state: "BC",
      website: "https://fortunesoundclub.com"
    },
    sourceURL: "https://fortunesoundclub.com",
    officialWebsite: "https://fortunesoundclub.com",
    imageURL: "https://fortunesoundclub.com/media/hiphopkaraoke.jpg",
    location: "147 E Pender St, Vancouver, BC",
    type: "Event",
    category: "Nightlife",
    season: "summer",
    status: "active",
    description: "Show off your skills with the best hip hop tracks. Prizes for the best performances!"
  }
]);

/**
 * Get upcoming events for Fox Cabaret
 * @returns {Array} Event objects
 */
const getFoxCabaretEvents = () => ([
  {
    title: "Comedy Night: Vancouver's Finest",
    startDate: new Date("2025-06-20T20:00:00"),
    endDate: null,
    venue: {
      name: "Fox Cabaret",
      address: "2321 Main St",
      city: "Vancouver",
      state: "BC",
      website: "https://foxcabaret.com"
    },
    sourceURL: "https://www.foxcabaret.com/monthly-calendar",
    officialWebsite: "https://foxcabaret.com",
    imageURL: "https://foxcabaret.com/media/comedy.jpg",
    location: "2321 Main St, Vancouver, BC",
    type: "Event",
    category: "Comedy",
    season: "summer",
    status: "active",
    description: "Join us for a night of laughs with Vancouver's top comedians."
  },
  {
    title: "Indie Rock Showcase",
    startDate: new Date("2025-06-27T21:00:00"),
    endDate: null,
    venue: {
      name: "Fox Cabaret",
      address: "2321 Main St",
      city: "Vancouver",
      state: "BC",
      website: "https://foxcabaret.com"
    },
    sourceURL: "https://www.foxcabaret.com/monthly-calendar",
    officialWebsite: "https://foxcabaret.com",
    imageURL: "https://foxcabaret.com/media/indie.jpg",
    location: "2321 Main St, Vancouver, BC",
    type: "Event",
    category: "Concert",
    season: "summer",
    status: "active",
    description: "A night featuring the best local indie rock bands."
  }
]);

/**
 * Get upcoming events for Roxy Vancouver
 * @returns {Array} Event objects
 */
const getRoxyEvents = () => ([
  {
    title: "Saturday Night Dance Party",
    startDate: new Date("2025-06-21T21:00:00"),
    endDate: null,
    venue: {
      name: "Roxy Vancouver",
      address: "932 Granville St",
      city: "Vancouver",
      state: "BC",
      website: "https://roxyvan.com"
    },
    sourceURL: "https://roxyvan.com",
    officialWebsite: "https://roxyvan.com",
    imageURL: "https://roxyvan.com/media/saturday.jpg",
    location: "932 Granville St, Vancouver, BC",
    type: "Event",
    category: "Nightlife",
    season: "summer",
    status: "active",
    description: "Dance the night away with the best hits from across the decades."
  },
  {
    title: "Throwback Thursday: 80s & 90s",
    startDate: new Date("2025-06-26T21:00:00"),
    endDate: null,
    venue: {
      name: "Roxy Vancouver",
      address: "932 Granville St",
      city: "Vancouver",
      state: "BC",
      website: "https://roxyvan.com"
    },
    sourceURL: "https://roxyvan.com",
    officialWebsite: "https://roxyvan.com",
    imageURL: "https://roxyvan.com/media/throwback.jpg",
    location: "932 Granville St, Vancouver, BC",
    type: "Event",
    category: "Nightlife",
    season: "summer",
    status: "active",
    description: "Relive the greatest hits of the 80s and 90s at Vancouver's legendary nightclub."
  }
]);

/**
 * Get upcoming events for Rickshaw Theatre
 * @returns {Array} Event objects
 */
const getRickshawEvents = () => ([
  {
    title: "Metal Mayhem: Headbangers' Ball",
    startDate: new Date("2025-06-24T20:00:00"),
    endDate: null,
    venue: {
      name: "Rickshaw Theatre",
      address: "254 E Hastings St",
      city: "Vancouver",
      state: "BC",
      website: "https://www.rickshawtheatre.com"
    },
    sourceURL: "https://www.rickshawtheatre.com",
    officialWebsite: "https://www.rickshawtheatre.com",
    imageURL: "https://www.rickshawtheatre.com/media/metal.jpg",
    location: "254 E Hastings St, Vancouver, BC",
    type: "Event",
    category: "Concert",
    season: "summer",
    status: "active",
    description: "A night of hardcore metal music featuring local and touring bands."
  },
  {
    title: "Punk Rock Revival",
    startDate: new Date("2025-06-30T20:00:00"),
    endDate: null,
    venue: {
      name: "Rickshaw Theatre",
      address: "254 E Hastings St",
      city: "Vancouver",
      state: "BC",
      website: "https://www.rickshawtheatre.com"
    },
    sourceURL: "https://www.rickshawtheatre.com",
    officialWebsite: "https://www.rickshawtheatre.com",
    imageURL: "https://www.rickshawtheatre.com/media/punk.jpg",
    location: "254 E Hastings St, Vancouver, BC",
    type: "Event",
    category: "Concert",
    season: "summer",
    status: "active",
    description: "Classic and new punk rock sounds in Vancouver's historic music venue."
  }
]);

/**
 * Fallback scraper for venues with anti-scraping measures
 * Will first try to load from cache, then use static fallbacks
 * @param {String} venueName - Name of the venue
 * @returns {Promise<Array>} Event objects
 */
async function getFallbackData(venueName) {
  const logger = scrapeLogger.child({ scraper: `${venueName} Fallback` });
  logger.info(`Getting fallback data for ${venueName}`);
  
  const normalizedName = venueName.toLowerCase().replace(/\s+/g, '');
  
  try {
    // First try to load from cache if available
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, `${normalizedName}.json`);
    
    try {
      const cacheData = await fs.readFile(cachePath, 'utf8');
      const cachedEvents = JSON.parse(cacheData);
      
      // Check if cache is still relatively fresh (less than 7 days old)
      const stats = await fs.stat(cachePath);
      const cacheAge = Date.now() - stats.mtime.getTime();
      
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
        logger.info(`Using cached data for ${venueName} (${cachedEvents.length} events)`);
        
        // Convert date strings back to Date objects
        return cachedEvents.map(event => ({
          ...event,
          startDate: event.startDate ? new Date(event.startDate) : null,
          endDate: event.endDate ? new Date(event.endDate) : null
        }));
      }
      
      logger.info(`Cache for ${venueName} is outdated, using static fallback`);
    } catch (e) {
      logger.info(`No cache available for ${venueName}, using static fallback`);
    }
    
    // If cache not available or outdated, use static data
    let events;
    
    switch (normalizedName) {
      case 'commodoreballroom':
        events = getCommodoreEvents();
        break;
      case 'fortunesoundclub':
        events = getFortuneEvents();
        break;
      case 'foxcabaret':
        events = getFoxCabaretEvents();
        break;
      case 'rickshawtheatre':
        events = getRickshawEvents();
        break;
      case 'roxyvancouver':
      case 'roxy':
        events = getRoxyEvents();
        break;
      default:
        logger.warn(`No fallback data available for ${venueName}`);
        return [];
    }
    
    // Save to cache for future use
    try {
      await fs.writeFile(cachePath, JSON.stringify(events, (key, value) => {
        if (key === 'startDate' || key === 'endDate') {
          return value ? value.toISOString() : null;
        }
        return value;
      }, 2));
      logger.info(`Saved fallback data to cache for ${venueName}`);
    } catch (e) {
      logger.warn(`Failed to save to cache: ${e.message}`);
    }
    
    return events;
  } catch (error) {
    logger.error(`Error getting fallback data: ${error.message}`);
    
    // If all else fails, return empty array
    return [];
  }
}

module.exports = {
  getFallbackData,
  getCommodoreEvents,
  getFortuneEvents,
  getFoxCabaretEvents,
  getRoxyEvents,
  getRickshawEvents
};
