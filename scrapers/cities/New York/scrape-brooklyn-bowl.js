const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brooklyn Bowl events...');
  const scraper = createUniversalScraper(
    'Brooklyn Bowl',
    'https://www.brooklynbowl.com/new-york/events',
    '61 Wythe Ave, Brooklyn, NY 11249'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
