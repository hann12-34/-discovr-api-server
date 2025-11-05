const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Social Capital Theatre events...');
  const scraper = createUniversalScraper(
    'Social Capital Theatre',
    'https://www.blogto.com/eat_drink/',
    '154 Danforth Ave, Toronto, ON M4K 1N1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
