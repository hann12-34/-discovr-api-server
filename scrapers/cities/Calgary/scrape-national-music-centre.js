const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎵 Scraping National Music Centre (Studio Bell) events...');
  const scraper = createUniversalScraper(
    'National Music Centre (Studio Bell)',
    'https://www.studiobell.ca/whats-on',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
