const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Broken City events...');
  const scraper = createUniversalScraper(
    'Broken City',
    'https://www.instagram.com/brokencityyyc/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
