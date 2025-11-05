const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Apollo Theater events...');
  const scraper = createUniversalScraper(
    'Apollo Theater',
    'https://www.apollotheater.org/',
    '253 W 125th St, New York, NY 10027'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
