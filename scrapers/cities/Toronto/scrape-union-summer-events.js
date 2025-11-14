const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Union Summer events...');
  const scraper = createUniversalScraper(
    'Union Summer',
    'https://unionsummer.com',
    '65 Front St W, Toronto, ON M5J 1E6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
