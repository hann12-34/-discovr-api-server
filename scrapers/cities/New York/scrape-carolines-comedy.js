const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Carolines on Broadway events...');
  const scraper = createUniversalScraper(
    'Carolines on Broadway',
    'https://carolines.com/events',
    '1626 Broadway, New York, NY 10019'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
