const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Carnegie Hall events...');
  const scraper = createUniversalScraper(
    'Carnegie Hall',
    'https://www.carnegiehall.org/calendar',
    '881 7th Ave, New York, NY 10019'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
