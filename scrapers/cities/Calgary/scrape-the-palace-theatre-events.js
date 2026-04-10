const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Palace Theatre events...');
  const scraper = createUniversalScraper(
    'Palace Theatre',
    'https://thepalacetheatre.ca/events/',
    '219 8 Ave SW, Calgary, AB T2P 1B5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
