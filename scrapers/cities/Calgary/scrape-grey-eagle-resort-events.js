const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Grey Eagle Resort & Casino events...');
  const scraper = createUniversalScraper(
    'Grey Eagle Resort & Casino',
    'https://www.greyeagleresortandcasino.ca/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
