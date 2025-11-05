const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Sultan Room events...');
  const scraper = createUniversalScraper(
    'Sultan Room',
    'https://www.sultanroom.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
