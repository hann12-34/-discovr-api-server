const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Terminal 5 events...');
  const scraper = createUniversalScraper(
    'Terminal 5',
    'https://www.terminal5nyc.com/events',
    '610 W 56th St, New York, NY 10019'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
