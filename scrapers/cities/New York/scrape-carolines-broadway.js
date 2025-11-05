const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Carolines Broadway events...');
  const scraper = createUniversalScraper(
    'Carolines Broadway',
    'https://www.carolines.com/calendar/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
