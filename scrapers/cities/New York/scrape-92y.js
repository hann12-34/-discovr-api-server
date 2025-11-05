const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping 92y events...');
  const scraper = createUniversalScraper(
    '92y',
    'https://www.92ny.org/event',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
