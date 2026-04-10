const createUniversalScraper = require('./universal-scraper-template');
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeEvents(city = 'Calgary') {
  console.log('🍻 Scraping Last Best Brewing & Distilling events...');
  const scraper = createUniversalScraper(
    'Last Best Brewing & Distilling',
    'https://lastbestbrewing.com/events/',
    '607 11 Ave SW, Calgary, AB T2R 0E1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
