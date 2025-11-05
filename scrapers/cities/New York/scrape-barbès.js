const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Barbès events...');
  const scraper = createUniversalScraper(
    'Barbès',
    'https://barbesbrooklyn.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
