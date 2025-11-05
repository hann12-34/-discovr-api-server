const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Tranzac Club events...');
  const scraper = createUniversalScraper(
    'Tranzac Club',
    'https://www.blogto.com/events/',
    '292 Brunswick Ave, Toronto, ON M5S 2M7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
