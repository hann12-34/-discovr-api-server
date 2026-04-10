const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎵 Scraping National Music Centre (Studio Bell) events...');
  const scraper = createUniversalScraper(
    'National Music Centre (Studio Bell)',
    'https://www.studiobell.ca/whats-on',
    '850 4 St SE, Calgary, AB T2G 1R1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
