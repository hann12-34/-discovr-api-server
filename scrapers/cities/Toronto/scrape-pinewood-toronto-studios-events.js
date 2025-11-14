const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Pinewood Toronto Studios events...');
  const scraper = createUniversalScraper(
    'Pinewood Toronto Studios',
    'https://www.pinewoodgroup.com',
    '225 Commissioners St, Toronto, ON M4M 1A9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
