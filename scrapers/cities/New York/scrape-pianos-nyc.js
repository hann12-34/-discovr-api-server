const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Pianos NYC events...');
  const scraper = createUniversalScraper(
    'Pianos NYC',
    'https://pianosnyc.com/events',
    '158 Ludlow St, New York, NY 10002'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
