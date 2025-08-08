/**
 * SCRAPER TEMPLATE WITH AUTO-CITY DETECTION
 * Copy this template for ANY new scraper in ANY city
 * City is automatically detected from folder path!
 */

const { processBatchWithCity } = require('../../utils/auto-detect-city');

class CityScraperTemplate {
  constructor() {
    // City will be auto-detected from folder path
    console.log('🔧 Scraper initialized with auto-city detection');
  }

  async scrapeEvents() {
    try {
      // Your scraping logic here
      const rawEvents = await this.fetchEventsFromSource();
      
      // 🎯 MAGIC: Auto-detect city and ensure proper venue.name
      // This single line handles everything:
      const eventsWithProperVenueNames = processBatchWithCity(rawEvents, __filename);
      
      return eventsWithProperVenueNames;
      
    } catch (error) {
      console.error('❌ Scraping failed:', error);
      return [];
    }
  }

  async fetchEventsFromSource() {
    // Replace this with your actual scraping logic
    return [
      {
        title: "Example Event",
        startDate: new Date().toISOString(),
        venue: "Example Venue", // Can be string or object - auto-handled
        description: "Sample event description"
      }
    ];
  }
}

module.exports = CityScraperTemplate;