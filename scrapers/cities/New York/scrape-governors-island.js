const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Governors Island events...');
  const scraper = createUniversalScraper(
    'Governors Island',
    'https://www.govisland.com/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
