const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Sidewalk Cafe events...');
  const scraper = createUniversalScraper(
    'Sidewalk Cafe',
    'https://sidewalkcafe-nyc.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
