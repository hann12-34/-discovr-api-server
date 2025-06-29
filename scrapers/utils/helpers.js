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
 * Normalize and clean text content
 * @param {String} text - Text to clean
 * @returns {String} - Cleaned text
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract clean image URL from various formats
 * @param {String} imageUrl - Raw image URL from source
 * @returns {String} - Clean, usable image URL
 */
function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return '';
  
  // Remove query parameters if not needed
  return imageUrl.split('?')[0];
}

/**
 * Safely parse a date string to a Date object
 * @param {String} dateString - Date string from scraper
 * @returns {Date|null} - JavaScript Date object or null if invalid
 */
function parseDate(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Sleep/wait function for throttling requests
 * @param {Number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine price range category from price information
 * @param {Number|String} price - Price amount or description
 * @returns {String} - Price range category (Free, Low, Moderate, High)
 */
function determinePriceRange(price) {
  if (!price || price === 0 || /free/i.test(price.toString())) return 'Free';
  
  // If price is a number
  if (typeof price === 'number') {
    if (price < 20) return 'Low';
    if (price < 50) return 'Moderate';
    return 'High';
  }
  
  // If price is a string description
  const priceString = price.toString().toLowerCase();
  if (priceString.includes('$$$')) return 'High';
  if (priceString.includes('$$')) return 'Moderate';
  if (priceString.includes('$')) return 'Low';
  
  return 'Varies'; // Default if we can't determine
}

/**
 * Normalize event object to standard format
 * @param {Object} event - Event object from scraper
 * @param {String} source - Name of the source (eventbrite, meetup, etc.)
 * @returns {Object} - Normalized event object
 */
function normalizeEvent(event, source) {
  // Create base event with required fields
  const normalizedEvent = {
    id: event.id || generateDeterministicId(event),
    title: cleanText(event.title || event.name || ''),
    description: cleanText(event.description || ''),
    image: normalizeImageUrl(event.image || event.photo_url || event.cover || ''),
    season: event.season || mapDateToSeason(parseDate(event.startDate || event.date)),
    location: cleanText(event.location || event.venue?.name || ''),
    startDate: parseDate(event.startDate || event.date || event.start_date),
    endDate: parseDate(event.endDate || event.end_date),
    category: event.category || 'General',
    priceRange: event.priceRange || determinePriceRange(event.price),
    dataSources: [source],
    lastUpdated: new Date()
  };

  // Add venue information if available
  if (event.venue) {
    normalizedEvent.venue = {
      name: cleanText(event.venue.name || ''),
      address: cleanText(event.venue.address || ''),
      city: cleanText(event.venue.city || ''),
      state: cleanText(event.venue.state || ''),
      country: cleanText(event.venue.country || '')
    };
  }

  // Add additional fields if available
  if (event.sourceURL) normalizedEvent.sourceURL = event.sourceURL;
  if (event.officialWebsite) normalizedEvent.officialWebsite = event.officialWebsite;
  if (event.latitude && event.longitude) {
    normalizedEvent.latitude = event.latitude;
    normalizedEvent.longitude = event.longitude;
  }

  return normalizedEvent;
}

module.exports = {
  generateDeterministicId,
  generateRandomId,
  mapDateToSeason,
  cleanText,
  normalizeImageUrl,
  parseDate,
  sleep,
  determinePriceRange,
  normalizeEvent
};
