const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brooklyn Steel events...');
  const scraper = createUniversalScraper(
    'Brooklyn Steel',
    'https://www.brooklynsteel.com/events',
    '319 Frost St, Brooklyn, NY 11222'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
