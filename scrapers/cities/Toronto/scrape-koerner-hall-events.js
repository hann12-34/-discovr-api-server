const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Koerner Hall events...');
  const scraper = createUniversalScraper(
    'Koerner Hall',
    'https://www.blogto.com/events/',
    '273 Bloor St W, Toronto, ON M5S 1W2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
