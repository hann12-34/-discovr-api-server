const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Good Room events...');
  const scraper = createUniversalScraper(
    'Good Room',
    'https://goodroombk.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
