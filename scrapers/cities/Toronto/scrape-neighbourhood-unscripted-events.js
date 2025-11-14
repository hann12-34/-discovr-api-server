const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Neighbourhood Unscripted events...');
  const scraper = createUniversalScraper(
    'Neighbourhood Unscripted',
    'https://neighbourhoodunscripted.com/events',
    '934 College St, Toronto, ON M6H 1A5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
