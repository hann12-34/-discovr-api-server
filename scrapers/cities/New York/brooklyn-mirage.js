const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brooklyn Mirage events...');
  const scraper = createUniversalScraper(
    'Brooklyn Mirage',
    'https://www.beforel.com/venue/brooklyn-mirage/events',
    '140 Stewart Ave, Brooklyn, NY 11237'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
