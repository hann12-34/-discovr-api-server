const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Noir events...');
  const scraper = createUniversalScraper(
    'Noir',
    'https://noirtoronto.com/events/',
    '2200 Yonge St, Toronto, ON M4S 2C6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
