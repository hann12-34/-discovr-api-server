const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Jubilee Auditorium events...');
  const scraper = createUniversalScraper(
    'Jubilee Auditorium',
    'https://www.jubileeauditorium.com/calgary/whats-on',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
