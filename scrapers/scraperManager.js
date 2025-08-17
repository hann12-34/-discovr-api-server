/**
 * Scraper Manager for Discovr API
 * Manages all venue scrapers and provides centralized access to event data
 */

const fs = require('fs');
const path = require('path');

class ScraperManager {
  constructor() {
    this.scrapers = new Map();
    this.loadAllScrapers();
  }

  /**
   * Load all scrapers from cities directories
   */
  loadAllScrapers() {
    const citiesPath = path.join(__dirname, 'cities');
    
    if (!fs.existsSync(citiesPath)) {
      console.log('⚠️ Cities directory not found, creating empty scrapers map');
      return;
    }

    const cities = fs.readdirSync(citiesPath).filter(dir => 
      fs.statSync(path.join(citiesPath, dir)).isDirectory()
    );

    console.log(`📁 Loading scrapers from ${cities.length} cities...`);

    cities.forEach(city => {
      this.loadCityScrapers(city);
    });

    console.log(`✅ Loaded ${this.scrapers.size} scrapers from all cities`);
  }

  /**
   * Load scrapers from a specific city
   * @param {string} cityName - Name of the city
   */
  loadCityScrapers(cityName) {
    const cityPath = path.join(__dirname, 'cities', cityName);
    
    if (!fs.existsSync(cityPath)) {
      console.log(`⚠️ City directory not found: ${cityName}`);
      return;
    }

    const scraperFiles = fs.readdirSync(cityPath)
      .filter(file => file.endsWith('.js') && !file.includes('_backup') && !file.includes('_corrupted'))
      .filter(file => !file.includes('index.js')); // Skip index files

    console.log(`📍 Loading ${scraperFiles.length} scrapers from ${cityName}...`);

    scraperFiles.forEach(file => {
      try {
        const scraperPath = path.join(cityPath, file);
        const scraperName = file.replace('.js', '');
        
        // Clear require cache to get fresh version
        delete require.cache[require.resolve(scraperPath)];
        
        const ScraperClass = require(scraperPath);
        
        if (typeof ScraperClass === 'function') {
          this.scrapers.set(`${cityName}/${scraperName}`, ScraperClass);
          console.log(`✅ Loaded scraper: ${cityName}/${scraperName}`);
        } else if (typeof ScraperClass === 'object' && ScraperClass.default) {
          // Handle ES6 exports
          this.scrapers.set(`${cityName}/${scraperName}`, ScraperClass.default);
          console.log(`✅ Loaded scraper (ES6): ${cityName}/${scraperName}`);
        } else {
          console.log(`⚠️ Invalid scraper format: ${cityName}/${scraperName}`);
        }
      } catch (error) {
        console.log(`❌ Failed to load scraper ${cityName}/${file}: ${error.message}`);
      }
    });
  }

  /**
   * Get all scrapers
   * @returns {Map} Map of all scrapers
   */
  getAllScrapers() {
    return this.scrapers;
  }

  /**
   * Get scrapers for a specific city
   * @param {string} cityName - Name of the city
   * @returns {Map} Map of scrapers for the city
   */
  getCityScrapers(cityName) {
    const cityScrapers = new Map();
    
    for (const [key, scraper] of this.scrapers.entries()) {
      if (key.startsWith(`${cityName}/`)) {
        cityScrapers.set(key, scraper);
      }
    }
    
    return cityScrapers;
  }

  /**
   * Get a specific scraper by name
   * @param {string} scraperName - Full scraper name (city/venue)
   * @returns {Function|null} Scraper class or null if not found
   */
  getScraper(scraperName) {
    return this.scrapers.get(scraperName) || null;
  }

  /**
   * Run a specific scraper
   * @param {string} scraperName - Full scraper name (city/venue)
   * @returns {Promise<Array>} Array of events
   */
  async runScraper(scraperName) {
    const ScraperClass = this.getScraper(scraperName);
    
    if (!ScraperClass) {
      throw new Error(`Scraper not found: ${scraperName}`);
    }

    try {
      if (typeof ScraperClass === 'function') {
        // Handle function export
        const events = await ScraperClass();
        return this.formatEventsForDatabase(events, scraperName);
      } else {
        // Handle class export
        const scraper = new ScraperClass();
        const events = await scraper.scrape();
        return this.formatEventsForDatabase(events, scraperName);
      }
    } catch (error) {
      console.error(`Error running scraper ${scraperName}:`, error.message);
      return [];
    }
  }

  /**
   * Run all scrapers for a city
   * @param {string} cityName - Name of the city
   * @returns {Promise<Array>} Array of all events from the city
   */
  async runCityScrapers(cityName) {
    const cityScrapers = this.getCityScrapers(cityName);
    const allEvents = [];

    console.log(`🚀 Running ${cityScrapers.size} scrapers for ${cityName}...`);

    for (const [scraperName] of cityScrapers) {
      try {
        const events = await this.runScraper(scraperName);
        allEvents.push(...events);
        console.log(`✅ ${scraperName}: ${events.length} events`);
      } catch (error) {
        console.error(`❌ ${scraperName}: ${error.message}`);
      }
    }

    console.log(`🎉 ${cityName} total: ${allEvents.length} events`);
    return allEvents;
  }

  /**
   * Run all scrapers from all cities
   * @returns {Promise<Array>} Array of all events
   */
  async runAllScrapers() {
    const allEvents = [];
    const cities = [...new Set([...this.scrapers.keys()].map(key => key.split('/')[0]))];

    console.log(`🌍 Running scrapers from ${cities.length} cities...`);

    for (const city of cities) {
      try {
        const cityEvents = await this.runCityScrapers(city);
        allEvents.push(...cityEvents);
      } catch (error) {
        console.error(`Error running scrapers for ${city}:`, error.message);
      }
    }

    console.log(`🎊 Grand total: ${allEvents.length} events from all cities`);
    return allEvents;
  }

  /**
   * Format events for database storage
   * @param {Array} events - Raw events from scraper
   * @param {string} scraperName - Name of the scraper
   * @returns {Array} Formatted events
   */
  formatEventsForDatabase(events, scraperName) {
    if (!Array.isArray(events)) {
      console.log(`⚠️ Invalid events format from ${scraperName}, expected array`);
      return [];
    }

    return events.map(event => {
      // Ensure required fields exist
      const formattedEvent = {
        title: event.title || 'Untitled Event',
        description: event.description || '',
        startDate: event.startDate || new Date(),
        endDate: event.endDate || event.startDate || new Date(),
        venue: event.venue || {},
        categories: Array.isArray(event.categories) ? event.categories : ['General'],
        sourceURL: event.sourceURL || '',
        lastUpdated: new Date(),
        scraper: scraperName,
        ...event
      };

      // Ensure venue has required fields
      if (!formattedEvent.venue.city) {
        const city = scraperName.split('/')[0];
        formattedEvent.venue.city = city;
      }

      return formattedEvent;
    }).filter(event => event.title && event.title.length > 0);
  }

  /**
   * Get scraper statistics
   * @returns {Object} Statistics about loaded scrapers
   */
  getStats() {
    const cities = [...new Set([...this.scrapers.keys()].map(key => key.split('/')[0]))];
    const cityStats = {};

    cities.forEach(city => {
      const cityScrapers = this.getCityScrapers(city);
      cityStats[city] = cityScrapers.size;
    });

    return {
      totalScrapers: this.scrapers.size,
      cities: cities.length,
      cityBreakdown: cityStats
    };
  }
}

// Create singleton instance
const scraperManager = new ScraperManager();

module.exports = scraperManager;
module.exports.ScraperManager = ScraperManager;
module.exports.formatEventsForDatabase = scraperManager.formatEventsForDatabase.bind(scraperManager);
