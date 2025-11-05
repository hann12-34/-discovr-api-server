const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping The Hifi Club events...');
  const scraper = createUniversalScraper(
    'The Hifi Club',
    'https://ra.co/clubs/85743/events',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
