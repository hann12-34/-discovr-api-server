const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Lula Lounge events...');
  const scraper = createUniversalScraper(
    'Lula Lounge',
    'https://lulalounge.ca/events',
    '1585 Dundas St W, Toronto, ON M6K 1T9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
