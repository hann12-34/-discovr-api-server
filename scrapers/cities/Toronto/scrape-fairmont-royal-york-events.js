const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Fairmont Royal York events...');
  const scraper = createUniversalScraper(
    'Fairmont Royal York',
    'https://www.fairmont.com/royal-york-toronto/',
    '100 Front St W, Toronto, ON M5J 1E3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
