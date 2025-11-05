const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Path Underground events...');
  const scraper = createUniversalScraper(
    'Path Underground',
    'https://www.blogto.com/events/',
    '10 Bay St, Toronto, ON M5J 2R8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
