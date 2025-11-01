/**
 * Michael J Fox Theatre Events Scraper
 * Scrapes upcoming events from Michael J Fox Theatre (Burnaby)
 * Part of Burnaby venues serving Vancouver area
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const MichaelJFoxTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from Michael J Fox Theatre...');
    
    // Note: Site domain issues, returning empty array until resolved
    console.log('⚠️ Michael J Fox Theatre site domain issues - returning empty array');
    return [];

    try {
      const response = await axios.get('https://www.michaeljfoxtheatre.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      console.log(`Found ${events.length} total events from Michael J Fox Theatre`);
      return events;

    } catch (error) {
      console.error('Error scraping Michael J Fox Theatre events:', error.message);
      return [];
    }
  }
};


module.exports = MichaelJFoxTheatreEvents.scrape;
