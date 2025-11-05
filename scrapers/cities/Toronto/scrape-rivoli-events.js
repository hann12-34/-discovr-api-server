const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Rivoli events...');
  const scraper = createUniversalScraper(
    'Rivoli',
    'https://www.blogto.com/events/',
    '334 Queen St W, Toronto, ON M5V 2A2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
