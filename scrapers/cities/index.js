/**
 * City-specific scraper coordinator
 * Orchestrates scrapers for different cities
 */

class CityScraper {
  constructor() {
    this.sourceIdentifier = 'city-events';
    this.citySourcePaths = {
      vancouver: './vancouver',
      calgary: './Calgary',
      montreal: './Montreal',
      'new-york': './New York',
      toronto: './Toronto',
      miami: './Miami',
      'los-angeles': './Los Angeles',
      seattle: './Seattle'
    };
  }

  /**
   * Run scrapers for all configured cities
   * @returns {Promise<Array>} - Aggregated events from all city scrapers
   */
  async scrape(options = {}) {
    console.log('Starting city scrapers...');
    
    const allEvents = [];
    const cities = options.cities || Object.keys(this.citySourcePaths);
    
    for (const city of cities) {
      const cityPath = this.citySourcePaths[city];
      if (cityPath) {
        try {
          console.log(`Running scrapers for ${city}...`);
          const cityScrapers = require(cityPath);
          const events = await cityScrapers.scrape();
          
          if (Array.isArray(events) && events.length > 0) {
            allEvents.push(...events);
            console.log(`Found ${events.length} events in ${city}`);
          } else {
            console.log(`No events found in ${city}`);
          }
        } catch (error) {
          console.error(`Error running scrapers for ${city}:`, error.message);
        }
      }
    }
    
    console.log(`City scrapers found ${allEvents.length} events in total`);
    return allEvents;
  }
}

module.exports = new CityScraper();
