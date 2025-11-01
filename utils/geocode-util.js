const axios = require('axios');

// Geocode an address to coordinates using OpenStreetMap Nominatim (free, no API key)
async function geocodeAddress(address, city, country = 'USA') {
  if (!address || address.length < 5) {
    return null;
  }
  
  const fullAddress = `${address}, ${city}, ${country}`;
  
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: fullAddress,
        format: 'json',
        limit: 1,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'DiscovEventApp/1.0'
      },
      timeout: 5000
    });
    
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.log(`   ⚠️  Geocode error for "${address}": ${error.message}`);
    return null;
  }
}

// Cache to avoid repeated geocoding of same addresses
const geocodeCache = new Map();

async function geocodeWithCache(address, city, country = 'USA') {
  const cacheKey = `${address}|${city}|${country}`.toLowerCase();
  
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }
  
  // Rate limiting: wait 1 second between requests to respect Nominatim policy
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const coords = await geocodeAddress(address, city, country);
  geocodeCache.set(cacheKey, coords);
  
  return coords;
}

module.exports = {
  geocodeAddress,
  geocodeWithCache
};
