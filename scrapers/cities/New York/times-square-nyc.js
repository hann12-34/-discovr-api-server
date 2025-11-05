const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Times Square NYC events...');
  const scraper = createUniversalScraper(
    'Times Square NYC',
    'https://www.timessquarenyc.org/events',
    'Times Square, New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
