const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Central Park events...');
  const scraper = createUniversalScraper(
    'Central Park',
    'https://www.centralparknyc.org/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
