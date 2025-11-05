const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping East York Civic Centre events...');
  const scraper = createUniversalScraper(
    'East York Civic Centre',
    'https://www.blogto.com/music/',
    '850 Coxwell Ave, East York, ON M4C 2X1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
