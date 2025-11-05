const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping BMO Field events...');
  const scraper = createUniversalScraper(
    'BMO Field',
    'https://www.bmofield.com/events',
    '170 Princes Blvd, Toronto, ON M6K 3C3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
