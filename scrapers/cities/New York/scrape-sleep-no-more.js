const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Sleep No More events...');
  const scraper = createUniversalScraper(
    'Sleep No More',
    'https://mckittrickhotel.com/events',
    '530 W 27th St, New York, NY 10001'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
