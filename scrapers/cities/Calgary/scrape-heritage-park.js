const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Heritage Park events...');
  const scraper = createUniversalScraper(
    'Heritage Park',
    'https://heritagepark.ca/whats-on-now/',
    '1900 Heritage Dr SW, Calgary, AB T2V 2X3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
