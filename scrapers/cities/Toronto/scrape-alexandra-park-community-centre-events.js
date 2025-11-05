const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Alexandra Park Community Centre events...');
  const scraper = createUniversalScraper(
    'Alexandra Park Community Centre',
    'https://www.blogto.com/events/',
    '200 Bathurst St, Toronto, ON M5T 2R8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
