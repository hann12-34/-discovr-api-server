const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Ballroom events...');
  const scraper = createUniversalScraper(
    'The Ballroom',
    'https://theballroom.ca/',
    '146 John St, Toronto, ON M5V 2E3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
