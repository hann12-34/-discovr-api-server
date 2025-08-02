/**
 * Venue Data Cleaner Utility
 * Cleans and standardizes venue location data to prevent coordinate display issues
 * 
 * Addresses user requirement: Users should NOT see raw coordinates in location text
 */

/**
 * Clean venue location text to remove raw coordinates
 * @param {string} location - The venue location string
 * @returns {string} - Cleaned location without coordinate text
 */
function cleanVenueLocation(location) {
  if (!location || typeof location !== 'string') {
    return '';
  }

  let cleaned = location.trim();
  
  // Remove coordinate patterns like "Coordinates: 43.6454, -79.3807"
  cleaned = cleaned.replace(/coordinates?\s*:\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+/gi, '');
  
  // Remove coordinate patterns like "(43.6454, -79.3807)"
  cleaned = cleaned.replace(/\([-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\)/g, '');
  
  // Remove coordinate patterns like "Lat: 43.6454, Lng: -79.3807"
  cleaned = cleaned.replace(/lat(itude)?\s*:\s*[-+]?\d*\.?\d+\s*,?\s*l(ng|on|ong)(itude)?\s*:\s*[-+]?\d*\.?\d+/gi, '');
  
  // Remove standalone coordinate pairs like "43.6454, -79.3807"
  cleaned = cleaned.replace(/\b[-+]?\d{1,3}\.\d{4,6}\s*,\s*[-+]?\d{1,3}\.\d{4,6}\b/g, '');
  
  // Clean up any resulting double spaces or leading/trailing commas
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').replace(/^,|,$/, '').trim();
  
  return cleaned;
}

/**
 * Extract and separate coordinates from location text
 * @param {string} location - The venue location string
 * @returns {object} - Object with cleaned location and extracted coordinates
 */
function extractCoordinatesFromLocation(location) {
  if (!location || typeof location !== 'string') {
    return { location: '', latitude: null, longitude: null };
  }

  let latitude = null;
  let longitude = null;
  
  // Try to extract coordinates from various patterns
  const coordPatterns = [
    /coordinates?\s*:\s*([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)/gi,
    /\(([-+]?\d*\.?\d+)\s*,\s*([-+]?\d*\.?\d+)\)/g,
    /lat(itude)?\s*:\s*([-+]?\d*\.?\d+)\s*,?\s*l(ng|on|ong)(itude)?\s*:\s*([-+]?\d*\.?\d+)/gi,
    /\b([-+]?\d{1,3}\.\d{4,6})\s*,\s*([-+]?\d{1,3}\.\d{4,6})\b/g
  ];
  
  for (const pattern of coordPatterns) {
    const match = pattern.exec(location);
    if (match) {
      latitude = parseFloat(match[1]);
      longitude = parseFloat(match[2]);
      break;
    }
  }
  
  const cleanedLocation = cleanVenueLocation(location);
  
  return {
    location: cleanedLocation,
    latitude: latitude,
    longitude: longitude
  };
}

/**
 * Clean venue object to ensure no coordinate text in user-visible fields
 * @param {object} venue - Venue object
 * @returns {object} - Cleaned venue object
 */
function cleanVenueObject(venue) {
  if (!venue || typeof venue !== 'object') {
    return venue;
  }

  const cleaned = { ...venue };
  
  // Clean location fields that users might see
  if (cleaned.location) {
    cleaned.location = cleanVenueLocation(cleaned.location);
  }
  
  if (cleaned.address) {
    cleaned.address = cleanVenueLocation(cleaned.address);
  }
  
  if (cleaned.streetAddress) {
    cleaned.streetAddress = cleanVenueLocation(cleaned.streetAddress);
  }
  
  if (cleaned.name) {
    cleaned.name = cleanVenueLocation(cleaned.name);
  }
  
  return cleaned;
}

/**
 * Clean event object to ensure no coordinate text in user-visible fields
 * @param {object} event - Event object
 * @returns {object} - Cleaned event object
 */
function cleanEventVenueData(event) {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const cleaned = { ...event };
  
  // Clean main location field
  if (cleaned.location) {
    cleaned.location = cleanVenueLocation(cleaned.location);
  }
  
  // Clean street address
  if (cleaned.streetAddress) {
    cleaned.streetAddress = cleanVenueLocation(cleaned.streetAddress);
  }
  
  // Clean venue object
  if (cleaned.venue) {
    cleaned.venue = cleanVenueObject(cleaned.venue);
  }
  
  return cleaned;
}

module.exports = {
  cleanVenueLocation,
  extractCoordinatesFromLocation,
  cleanVenueObject,
  cleanEventVenueData
};
