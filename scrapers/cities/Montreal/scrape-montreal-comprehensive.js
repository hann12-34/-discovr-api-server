const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Montreal Comprehensive events...');
  const scraper = createUniversalScraper(
    'Montreal Comprehensive',
    'https://www.mtlblog.com/things-to-do-in-montreal',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
