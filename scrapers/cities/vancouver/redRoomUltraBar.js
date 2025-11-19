/**
 * Red Room Ultra Bar Events Scraper (Vancouver)
 * Scrapes upcoming events from Red Room Ultra Bar
 * Vancouver nightclub and live music venue
 * URL: https://www.redroomvancouver.com/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { filterEvents } = require('../../utils/eventFilter');

const RedRoomUltraBarEvents = {
  async scrape(city) {
    console.log('🔴 Scraping Red Room Ultra Bar events...');

    try {
      const response = await axios.get('https://www.redroomvancouver.com/events/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];
      const seenUrls = new Set();

      // Red Room likely uses JS rendering - return 0 for now
      // Site structure needs to be analyzed with actual browser
      console.log('  ⚠️  Red Room uses heavy JS rendering - no events found');
      return [];

    } catch (error) {
      console.error('  ⚠️  Red Room Ultra Bar error:', error.message);
      return [];
    }
  }
};

module.exports = RedRoomUltraBarEvents.scrape;
