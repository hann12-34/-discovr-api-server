const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Trinity College Chapel events...');
  const scraper = createUniversalScraper(
    'Trinity College Chapel',
    'https://www.blogto.com/music/',
    '6 Hoskin Ave, Toronto, ON M5S 1H8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
