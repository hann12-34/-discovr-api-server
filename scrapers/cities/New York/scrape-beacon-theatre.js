const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Beacon Theatre events...');
  const scraper = createUniversalScraper(
    'Beacon Theatre',
    'https://www.msg.com/calendar?filter-venue=beacon-theatre',
    '2124 Broadway, New York, NY 10023'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
