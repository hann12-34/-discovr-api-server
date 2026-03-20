const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Cowboys Music Festival events...');
  const scraper = createUniversalScraper(
    'Cowboys Music Festival',
    'https://www.cowboysnightclub.com/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
