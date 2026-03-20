const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🍺 Scraping The Ship and Anchor Pub events...');
  const scraper = createUniversalScraper(
    'The Ship and Anchor Pub',
    'https://www.shipandanchor.com/events',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
