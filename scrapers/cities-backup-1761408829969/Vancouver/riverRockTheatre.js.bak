/**
 * River Rock Theatre Events Scraper
 * Scrapes upcoming events from River Rock Theatre (Richmond)
 * Major casino theatre venue serving Vancouver area
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const RiverRockTheatreEvents = {
  async scrape(city) {
    console.log('🔍 Scraping events from River Rock Theatre...');
    
    // Note: Site redirect to greatcanadian.com domain issues
    console.log('⚠️ River Rock Theatre site redirect issues - returning empty array');
    return [];

    try {
      const response = await axios.get('https://www.riverrock.com/entertainment/theatre/', {
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
      
      console.log(`Found ${events.length} total events from River Rock Theatre`);
      return events;

    } catch (error) {
      console.error('Error scraping River Rock Theatre events:', error.message);
      return [];
    }
  }
};


module.exports = RiverRockTheatreEvents.scrape;
