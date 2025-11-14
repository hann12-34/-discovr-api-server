const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Supermarket events...');
  const scraper = createUniversalScraper(
    'Supermarket',
    'https://supermarkettoronto.com',
    '268 Augusta Ave, Toronto, ON M5T 2L9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
