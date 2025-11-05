const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Broadway events...');
  const scraper = createUniversalScraper(
    'The Broadway',
    'https://www.thebroadwaybk.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
