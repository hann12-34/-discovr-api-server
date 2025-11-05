const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Mercury Lounge events...');
  const scraper = createUniversalScraper(
    'Mercury Lounge',
    'https://www.mercuryloungenyc.com/events',
    '217 E Houston St, New York, NY 10002'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
