const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Coda events...');
  const scraper = createUniversalScraper(
    'Coda',
    'https://www.codatoronto.com/events',
    '794 Bathurst St, Toronto, ON M5R 3G1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
