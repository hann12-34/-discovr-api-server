const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Collective events...');
  const scraper = createUniversalScraper(
    'The Collective',
    'https://thecollectivetoronto.com',
    '416 College St, Toronto, ON M5T 1T3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
