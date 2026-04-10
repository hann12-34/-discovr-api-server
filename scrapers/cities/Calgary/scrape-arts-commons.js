const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎭 Scraping Arts Commons events...');
  const scraper = createUniversalScraper(
    'Arts Commons',
    'https://www.artscommons.ca/whats-on',
    '205 8 Ave SE, Calgary, AB T2G 0K9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
