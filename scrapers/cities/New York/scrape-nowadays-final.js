const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Nowadays events...');
  const scraper = createUniversalScraper(
    'Nowadays',
    'https://nowadays.nyc/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
