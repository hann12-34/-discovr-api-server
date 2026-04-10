const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Dickens Pub events...');
  const scraper = createUniversalScraper(
    'Dickens Pub',
    'https://www.dickenspub.ca/events/',
    '1000 9 Ave SW, Calgary, AB T2P 3H8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
