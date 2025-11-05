const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Union Square Events events...');
  const scraper = createUniversalScraper(
    'Union Square Events',
    'https://www.unionsquarenyc.org/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
