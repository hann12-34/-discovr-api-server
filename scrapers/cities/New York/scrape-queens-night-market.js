const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Queens Night Market events...');
  const scraper = createUniversalScraper(
    'Queens Night Market',
    'https://queensnightmarket.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
