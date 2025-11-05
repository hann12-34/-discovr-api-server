const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Hot Docs Cinema events...');
  const scraper = createUniversalScraper(
    'Hot Docs Cinema',
    'https://www.blogto.com/events/',
    '506 Bloor St W, Toronto, ON M5S 1Y3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
