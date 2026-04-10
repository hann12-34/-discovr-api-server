const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Calgary Zoo events...');
  const scraper = createUniversalScraper(
    'Calgary Zoo',
    'https://www.calgaryzoo.com/events/',
    '210 St Georges Dr NE, Calgary, AB T2E 7V6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
