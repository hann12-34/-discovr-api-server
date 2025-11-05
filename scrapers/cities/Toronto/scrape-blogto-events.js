const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping BlogTO Events events...');
  const scraper = createUniversalScraper(
    'BlogTO Events',
    'https://www.blogto.com/events/',
    '121 Richmond St W Suite 701, Toronto, ON M5H 2K1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
