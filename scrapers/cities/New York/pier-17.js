const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Pier 17 events...');
  const scraper = createUniversalScraper(
    'Pier 17',
    'https://www.pier17ny.com/events/',
    '89 South St, New York, NY 10038'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
