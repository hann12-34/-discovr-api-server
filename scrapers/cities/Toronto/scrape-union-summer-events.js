const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Union Summer events...');
  const scraper = createUniversalScraper(
    'Union Summer',
    'https://www.blogto.com/eat_drink/',
    '65 Front St W, Toronto, ON M5J 1E6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
