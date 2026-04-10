const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Commonwealth Bar & Stage events...');
  const scraper = createUniversalScraper(
    'Commonwealth Bar & Stage',
    'https://www.thecommonwealth.ca/events',
    '731 10 Ave SW, Calgary, AB T2R 0B3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
