const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Roy Thomson Hall events...');
  const scraper = createUniversalScraper(
    'Roy Thomson Hall',
    'https://www.narcity.com/toronto/things-to-do',
    '60 Simcoe St, Toronto, ON M5J 2H5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
