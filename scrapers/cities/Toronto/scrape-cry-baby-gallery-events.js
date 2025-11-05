const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Cry Baby Gallery events...');
  const scraper = createUniversalScraper(
    'Cry Baby Gallery',
    'https://www.blogto.com/events/',
    '1520 Queen St W, Toronto, ON M6R 1A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
