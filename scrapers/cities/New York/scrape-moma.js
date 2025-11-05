const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Moma events...');
  const scraper = createUniversalScraper(
    'Moma',
    'https://www.moma.org/calendar/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
