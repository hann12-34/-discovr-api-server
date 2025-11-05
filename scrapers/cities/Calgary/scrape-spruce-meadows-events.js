const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Spruce Meadows events...');
  const scraper = createUniversalScraper(
    'Spruce Meadows',
    'https://www.sprucemeadows.com/tournaments/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
