const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Parkdale Food Centre events...');
  const scraper = createUniversalScraper(
    'Parkdale Food Centre',
    'https://nowtoronto.com/stage',
    '1499 Queen St W, Toronto, ON M6K 1M1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
