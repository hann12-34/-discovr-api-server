const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Dickens Pub events...');
  const scraper = createUniversalScraper(
    'Dickens Pub',
    'https://www.dickenspub.ca/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
