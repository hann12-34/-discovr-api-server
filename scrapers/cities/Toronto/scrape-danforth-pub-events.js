const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Danforth Pub events...');
  const scraper = createUniversalScraper(
    'Danforth Pub',
    'https://www.danforthpub.com',
    '147 Danforth Ave, Toronto, ON M4K 1N2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
