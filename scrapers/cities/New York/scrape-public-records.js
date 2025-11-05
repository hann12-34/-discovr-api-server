const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Public Records events...');
  const scraper = createUniversalScraper(
    'Public Records',
    'https://publicrecords.nyc/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
