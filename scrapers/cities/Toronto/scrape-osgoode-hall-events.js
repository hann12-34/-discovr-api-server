const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Osgoode Hall events...');
  const scraper = createUniversalScraper(
    'Osgoode Hall',
    'https://www.blogto.com/events/',
    '130 Queen St W, Toronto, ON M5H 2N6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
