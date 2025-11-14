const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Rosedale Community Centre events...');
  const scraper = createUniversalScraper(
    'Rosedale Community Centre',
    'https://www.toronto.ca/data/parks/prd/facilities/complex/1089',
    '1144 Bloor St W, Toronto, ON M6H 1M9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
