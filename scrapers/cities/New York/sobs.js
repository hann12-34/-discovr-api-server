const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping S.O.B.\'s events...');
  const scraper = createUniversalScraper(
    'S.O.B.\'s',
    'https://www.sobs.com/events',
    '204 Varick St, New York, NY 10014'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
