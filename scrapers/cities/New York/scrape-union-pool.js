const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Union Pool events...');
  const scraper = createUniversalScraper(
    'Union Pool',
    'https://union-pool.com/events',
    '484 Union Ave, Brooklyn, NY 11211'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
