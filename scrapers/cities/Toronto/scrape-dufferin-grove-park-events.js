const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Dufferin Grove Park events...');
  const scraper = createUniversalScraper(
    'Dufferin Grove Park',
    'https://www.blogto.com/music/',
    '875 Dufferin St, Toronto, ON M6H 4B1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
