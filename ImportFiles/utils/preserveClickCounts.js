/**
 * Utility to preserve click counts when re-importing events
 * This prevents click counts from being reset to 0 when scrapers run
 */

/**
 * Save click counts for a city before deleting events
 * @param {Collection} collection - MongoDB collection
 * @param {string} cityName - City name to filter by
 * @returns {Map} - Map of event key to click count
 */
async function saveClickCounts(collection, cityName) {
  console.log('📊 Saving click counts before clearing events...');
  
  const existingEvents = await collection.find({ 
    city: cityName, 
    source: { $ne: 'admin' },
    clickCount: { $gt: 0 }
  }).toArray();
  
  const clickCountMap = new Map();
  for (const event of existingEvents) {
    const key = `${(event.title || '').toLowerCase().trim()}|${(event.venue?.name || '').toLowerCase().trim()}`;
    clickCountMap.set(key, event.clickCount);
  }
  
  console.log(`💾 Saved ${clickCountMap.size} click counts to preserve`);
  return clickCountMap;
}

/**
 * Get preserved click count for an event
 * @param {Map} clickCountMap - Map from saveClickCounts
 * @param {string} title - Event title
 * @param {string} venueName - Venue name
 * @returns {number} - Preserved click count or 0
 */
function getPreservedClickCount(clickCountMap, title, venueName) {
  const key = `${(title || '').toLowerCase().trim()}|${(venueName || '').toLowerCase().trim()}`;
  return clickCountMap.get(key) || 0;
}

module.exports = {
  saveClickCounts,
  getPreservedClickCount
};
