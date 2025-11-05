const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brookfield Place events...');
  const scraper = createUniversalScraper(
    'Brookfield Place',
    'https://brookfieldplaceny.com/events',
    '230 Vesey St, New York, NY 10281'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
