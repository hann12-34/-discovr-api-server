const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping TV Eye events...');
  const scraper = createUniversalScraper(
    'TV Eye',
    'https://www.tveyenyc.com/',
    '313 Meserole St, Brooklyn, NY 11206'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
