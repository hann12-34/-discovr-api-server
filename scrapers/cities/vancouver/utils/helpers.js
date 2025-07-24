/**
 * Helper utilities for Discovr scrapers
 * Contains common functions used across different scraper implementations
 */

const { v4: uuidv4, v5: uuidv5 } = require('uuid');

// UUID namespace for Discovr events (generated once)
const DISCOVR_NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

/**
 * Generate a deterministic ID for an event based on its properties
 * This ensures the same event from different sources gets the same ID
 * @param {Object} event - Event object with properties
 * @returns {String} - Deterministic UUID
 */
function generateDeterministicId(event) {
  // Create a string that uniquely identifies the event
  // Use title, date, and location as they're most likely to be consistent across sources
  const idString = `${event.title}-${event.startDate}-${event.location}`.toLowerCase();
  return uuidv5(idString, DISCOVR_NAMESPACE);
}

/**
 * Generate a random UUID for events that don't have enough identifiable information
 * @returns {String} - Random UUID
 */
function generateRandomId() {
  return uuidv4();
}

/**
 * Maps a date string to a season
 * @param {Date} date - JavaScript Date object
 * @returns {String} - Season (Spring, Summer, Fall, Winter)
 */
function mapDateToSeason(date) {
  if (!date || !(date instanceof Date)) {
    return 'Unknown';
  }
  
  const month = date.getMonth();
  
  // Northern hemisphere seasons
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Fall';
  return 'Winter'; // months 11, 0, 1 (Dec, Jan, Feb)
}

/**
 * Extract clean image URL from various formats
 * @param {String} imageUrl - Raw image URL from source
 * @returns {String} - Clean, usable image URL
 */
function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return '';
  
  // Remove query parameters
  let cleanUrl = imageUrl.split('?')[0];
  
  // Add HTTPS if protocol is missing
  if (cleanUrl.startsWith('//')) {
    cleanUrl = 'https:' + cleanUrl;
  }
  
  return cleanUrl;
}

/**
 * Safely parse a date string to a Date object
 * @param {String} dateString - Date string from scraper
 * @returns {Date|null} - JavaScript Date object or null if invalid
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Try to create a date object
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (e) {
    return null;
  }
}

/**
 * Sleep/wait function for throttling requests
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Determine price range category from price information
 * @param {Number|String} price - Price amount or description
 * @returns {String} - Price range category (Free, Low, Moderate, High)
 */
function determinePriceRange(price) {
  // If price is explicitly free
  if (price === 0 || price === '0' || String(price).toLowerCase().includes('free')) {
    return 'Free';
  }
  
  // Try to extract a number if it's a string with a dollar amount
  let numericPrice = price;
  if (typeof price === 'string') {
    // Extract first number found in string
    const match = price.match(/\$?\s*(\d+(\.\d+)?)/);
    numericPrice = match ? parseFloat(match[1]) : NaN;
  }
  
  // Categorize based on numeric value
  if (isNaN(numericPrice)) {
    return 'Unknown';
  } else if (numericPrice <= 15) {
    return 'Low';
  } else if (numericPrice <= 50) {
    return 'Moderate';
  } else {
    return 'High';
  }
}

/**
 * Normalize event object to standard format
 * @param {Object} event - Event object from scraper
 * @param {String} source - Name of the source (eventbrite, meetup, etc.)
 * @returns {Object} - Normalized event object
 */
function normalizeEvent(event, source) {
  // Generate ID if not provided
  const id = event.id || (
    event.title && (event.startDate || event.startTime) ? 
      generateDeterministicId(event) : 
      generateRandomId()
  );
  
  // Ensure dates are Date objects
  const startDate = event.startDate instanceof Date ? 
    event.startDate : parseDate(event.startDate);
  
  const endDate = event.endDate instanceof Date ? 
    event.endDate : parseDate(event.endDate);
  
  return {
    id,
    title: event.title || 'Unnamed Event',
    description: event.description || '',
    startDate: startDate || null,
    endDate: endDate || null,
    location: event.location || 'TBD',
    imageUrl: normalizeImageUrl(event.imageUrl),
    url: event.url || '',
    category: event.category || 'Other',
    tags: event.tags || [],
    price: event.price || 'Unknown',
    priceRange: event.priceRange || determinePriceRange(event.price),
    source: source || 'vancouver-scrapers',
    season: startDate ? mapDateToSeason(startDate) : 'Unknown',
    lastUpdated: new Date(),
    // Add any additional standard fields here
  };
}

module.exports = {
  generateDeterministicId,
  generateRandomId,
  mapDateToSeason,
  normalizeImageUrl,
  parseDate,
  sleep,
  determinePriceRange,
  normalizeEvent,
};
