const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Danforth East events...');
  const scraper = createUniversalScraper(
    'Danforth East',
    'https://www.greektown.ca/events',
    '147 Danforth Ave, Toronto, ON M4K 1N2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
