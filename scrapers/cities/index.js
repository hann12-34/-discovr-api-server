/**
 * City-specific scraper coordinator
 * Orchestrates scrapers for different cities
 */

const vancouverScrapers = require('./vancouver');

class CityScraper {
  constructor() {
    this.sourceIdentifier = 'city-events';
    this.citySources = {
      vancouver: vancouverScrapers
    };
  }
  
  /**
   * Run scrapers for all configured cities
   * @returns {Promise<Array>} - Aggregated events from all city scrapers
   */
  async scrape(options = {}) {
    console.log('Starting city scrapers...');
    
    const allEvents = [];
    const cities = options.cities || Object.keys(this.citySources);
    
    for (const city of cities) {
      if (this.citySources[city]) {
        try {
          console.log(`Running scrapers for ${city}...`);
          const events = await this.citySources[city].scrape();
          
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
