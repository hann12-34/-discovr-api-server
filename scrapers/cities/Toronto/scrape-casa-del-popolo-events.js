const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Casa Del Popolo events...');
  const scraper = createUniversalScraper(
    'Casa Del Popolo',
    'https://www.blogto.com/events/',
    '1560 Bloor St W, Toronto, ON M6P 1A4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
