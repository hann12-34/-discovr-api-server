const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Union events...');
  const scraper = createUniversalScraper(
    'Toronto Union',
    'https://www.torontounion.ca',
    '65 Front St W, Toronto, ON M5J 1E6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
