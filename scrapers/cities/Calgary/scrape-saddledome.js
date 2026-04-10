const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🏟️  Scraping Saddledome events...');
  const scraper = createUniversalScraper(
    'Scotiabank Saddledome',
    'https://www.scotiabanksaddledome.com/events',
    '555 Saddledome Rise SE, Calgary, AB T2G 2W1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
