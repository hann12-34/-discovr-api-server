const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Town Hall events...');
  const scraper = createUniversalScraper(
    'Town Hall',
    'https://thetownhall.org/calendar',
    '123 W 43rd St, New York, NY 10036'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
