const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping SUMMIT One Vanderbilt events...');
  const scraper = createUniversalScraper(
    'SUMMIT One Vanderbilt',
    'https://summitov.com',
    '45 E 42nd St, New York, NY 10017'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
