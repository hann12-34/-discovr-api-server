const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Citi Field events...');
  const scraper = createUniversalScraper(
    'Citi Field',
    'https://www.mlb.com/mets/tickets',
    '41 Seaver Way, Queens, NY 11368'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
