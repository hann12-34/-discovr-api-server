/**
 * Geocoding Utility
 * Converts venue addresses to coordinates with NO FALLBACKS
 * If geocoding fails, returns null - no hardcoded defaults!
 */

const NodeGeocoder = require('node-geocoder');

// Initialize geocoder with OpenStreetMap (free, no API key needed)
// Must include custom User-Agent per OSM Nominatim policy
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
  fetchOptions: {
    headers: {
      'User-Agent': 'Discovr Event App/1.0 (https://discovr-proxy-server.onrender.com; contact@discovr.app)'
    }
  }
});

/**
 * Geocode a venue address to get coordinates
 * @param {string} address - Full venue address
 * @param {string} city - City name for better accuracy
 * @returns {Promise<{latitude: number, longitude: number}|null>}
 */
async function geocodeAddress(address, city = '') {
  try {
    // Combine address with city for better accuracy
    const fullAddress = city && !address.includes(city) 
      ? `${address}, ${city}` 
      : address;
    
    console.log(`🌍 Geocoding: ${fullAddress}`);
    
    const results = await geocoder.geocode(fullAddress);
    
    if (results && results.length > 0) {
      const { latitude, longitude } = results[0];
      
      // Only return valid coordinates (not 0, 0)
      if (latitude !== 0 && longitude !== 0) {
        console.log(`✅ Geocoded: [${longitude}, ${latitude}]`);
        return { latitude, longitude };
      }
    }
    
    console.log(`⚠️ Geocoding failed for: ${fullAddress}`);
    return null;
    
  } catch (error) {
    console.error(`❌ Geocoding error for "${address}":`, error.message);
    return null;
  }
}

/**
 * Geocode multiple addresses in batch (with rate limiting)
 * @param {Array<{address: string, city: string}>} addresses
 * @returns {Promise<Array<{latitude: number, longitude: number}|null>>}
 */
async function geocodeBatch(addresses) {
  const results = [];
  
  for (const { address, city } of addresses) {
    const coords = await geocodeAddress(address, city);
    results.push(coords);
    
    // Rate limit: wait 1 second between requests (OpenStreetMap policy)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

module.exports = {
  geocodeAddress,
  geocodeBatch
};
