const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Financial District events...');
  const scraper = createUniversalScraper(
    'Financial District',
    'https://www.blogto.com/events/',
    '1 King St W, Toronto, ON M5H 1A1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
