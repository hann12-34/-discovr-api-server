/**
 * City Assignment Enforcer
 * 
 * RULES:
 * 1. Scraper folder structure is AUTHORITATIVE for city assignment
 * 2. scrapers/cities/vancouver → Vancouver
 * 3. scrapers/cities/Toronto → Toronto  
 * 4. scrapers/cities/Calgary → Calgary
 * 5. scrapers/cities/Montreal → Montreal
 * 
 * This prevents undefined cities and ensures data integrity.
 */

const fs = require('fs');
const path = require('path');

// Known venue addresses that should override missing data
const KNOWN_VENUES = {
    'Poetry Jazz Cafe': {
        city: 'Toronto',
        address: '1078 Queen Street West, Toronto, ON M6J 1H6',
        province: 'ON',
        country: 'Canada'
    },
    'POETRY JAZZ CAFE': {
        city: 'Toronto', 
        address: '1078 Queen Street West, Toronto, ON M6J 1H6',
        province: 'ON',
        country: 'Canada'
    },
    // Add more known venues here as needed
};

// Source name patterns that indicate specific cities
const SOURCE_CITY_PATTERNS = {
    'poetry': 'Toronto',
    'poetry jazz cafe': 'Toronto',
    'poetryjazzcafe': 'Toronto',
    // Add more patterns as needed
};

/**
 * Get authoritative city based on scraper file path
 * @param {string} scraperFilePath - Path to the scraper file
 * @returns {string|null} - City name or null if cannot determine
 */
function getCityFromScraperPath(scraperFilePath) {
    const normalizedPath = scraperFilePath.replace(/\\/g, '/');
    
    if (normalizedPath.includes('/cities/vancouver/')) {
        return 'Vancouver';
    } else if (normalizedPath.includes('/cities/Toronto/')) {
        return 'Toronto';
    } else if (normalizedPath.includes('/cities/Calgary/')) {
        return 'Calgary';
    } else if (normalizedPath.includes('/cities/Montreal/')) {
        return 'Montreal';
    }
    
    return null;
}

/**
 * Get city from source name patterns
 * @param {string} source - Source name
 * @returns {string|null} - City name or null
 */
function getCityFromSource(source) {
    if (!source) return null;
    
    const normalizedSource = source.toLowerCase().trim();
    
    for (const [pattern, city] of Object.entries(SOURCE_CITY_PATTERNS)) {
        if (normalizedSource.includes(pattern)) {
            return city;
        }
    }
    
    return null;
}

/**
 * Get venue data from known venues
 * @param {string} venueName - Name of the venue
 * @returns {object|null} - Venue data or null
 */
function getKnownVenueData(venueName) {
    if (!venueName) return null;
    
    // Try exact match first
    if (KNOWN_VENUES[venueName]) {
        return KNOWN_VENUES[venueName];
    }
    
    // Try case-insensitive match
    const normalizedVenue = venueName.toLowerCase().trim();
    for (const [knownVenue, data] of Object.entries(KNOWN_VENUES)) {
        if (knownVenue.toLowerCase() === normalizedVenue) {
            return data;
        }
    }
    
    return null;
}

/**
 * Enforce city assignment for an event
 * @param {object} event - Event object to enforce city on
 * @param {string} scraperFilePath - Path to the scraper file (optional)
 * @returns {object} - Event with enforced city assignment
 */
function enforceCityAssignment(event, scraperFilePath = null) {
    let assignedCity = event.city;
    let reason = 'existing';
    
    // If city is missing, undefined, null, or "undefined", enforce assignment
    if (!assignedCity || assignedCity === 'undefined' || assignedCity === '') {
        
        // Strategy 1: Use scraper folder structure (most authoritative)
        if (scraperFilePath) {
            const cityFromPath = getCityFromScraperPath(scraperFilePath);
            if (cityFromPath) {
                assignedCity = cityFromPath;
                reason = `scraper folder: ${scraperFilePath}`;
            }
        }
        
        // Strategy 2: Use known venue data
        if (!assignedCity && event.venue) {
            const venueName = typeof event.venue === 'string' ? event.venue : event.venue.name;
            const knownVenueData = getKnownVenueData(venueName);
            
            if (knownVenueData) {
                assignedCity = knownVenueData.city;
                reason = `known venue: ${venueName}`;
                
                // Also update venue address if missing
                if (!event.streetAddress && knownVenueData.address) {
                    event.streetAddress = knownVenueData.address;
                }
                
                // Update venue object if needed
                if (typeof event.venue === 'object' && event.venue !== null) {
                    if (!event.venue.city) event.venue.city = knownVenueData.city;
                    if (!event.venue.province) event.venue.province = knownVenueData.province;
                    if (!event.venue.country) event.venue.country = knownVenueData.country;
                }
            }
        }
        
        // Strategy 3: Use source name patterns
        if (!assignedCity && event.source) {
            const cityFromSource = getCityFromSource(event.source);
            if (cityFromSource) {
                assignedCity = cityFromSource;
                reason = `source pattern: ${event.source}`;
            }
        }
        
        // Strategy 4: Extract from title (last resort)
        if (!assignedCity && event.title) {
            const title = event.title.toLowerCase();
            if (title.includes('vancouver')) {
                assignedCity = 'Vancouver';
                reason = 'title contains Vancouver';
            } else if (title.includes('toronto')) {
                assignedCity = 'Toronto';
                reason = 'title contains Toronto';
            } else if (title.includes('calgary')) {
                assignedCity = 'Calgary';
                reason = 'title contains Calgary';
            } else if (title.includes('montreal')) {
                assignedCity = 'Montreal';
                reason = 'title contains Montreal';
            }
        }
    }
    
    // Always assign the city
    event.city = assignedCity;
    
    // Add metadata for debugging
    if (reason !== 'existing') {
        event.__cityAssignmentReason = reason;
    }
    
    return event;
}

/**
 * Validate that event has required city
 * @param {object} event - Event to validate
 * @returns {boolean} - True if valid, false if missing city
 */
function validateEventCity(event) {
    return event.city && event.city !== 'undefined' && event.city !== '';
}

/**
 * Get all available cities from scraper folder structure
 * @returns {Array} - Array of available city names
 */
function getAvailableCities() {
    const citiesDir = path.join(__dirname, '../scrapers/cities');
    
    if (!fs.existsSync(citiesDir)) {
        return [];
    }
    
    return fs.readdirSync(citiesDir)
        .filter(dir => {
            const fullPath = path.join(citiesDir, dir);
            return fs.statSync(fullPath).isDirectory();
        })
        .map(dir => {
            // Normalize city names
            if (dir === 'vancouver') return 'Vancouver';
            if (dir === 'Toronto') return 'Toronto';
            if (dir === 'Calgary') return 'Calgary';
            if (dir === 'Montreal') return 'Montreal';
            return dir;
        });
}

/**
 * Add a new known venue
 * @param {string} venueName - Name of the venue
 * @param {object} venueData - Venue data (city, address, etc.)
 */
function addKnownVenue(venueName, venueData) {
    KNOWN_VENUES[venueName] = venueData;
}

module.exports = {
    enforceCityAssignment,
    validateEventCity,
    getCityFromScraperPath,
    getCityFromSource,
    getKnownVenueData,
    getAvailableCities,
    addKnownVenue,
    KNOWN_VENUES,
    SOURCE_CITY_PATTERNS
};
