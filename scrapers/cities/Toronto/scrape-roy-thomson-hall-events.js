const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎻 Scraping Roy Thomson Hall events...');
  const scraper = createUniversalScraper(
    'Roy Thomson Hall',
    'https://www.roythomson.com/events',
    '60 Simcoe St, Toronto, ON M5J 2H5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
