const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Cowboys Music Festival events...');
  const scraper = createUniversalScraper(
    'Cowboys Music Festival',
    'https://www.cowboysnightclub.com/',
    '421 12 Ave SE, Calgary, AB T2G 1A5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
