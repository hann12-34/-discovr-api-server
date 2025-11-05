const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping Palace Theatre events...');
  const scraper = createUniversalScraper(
    'Palace Theatre',
    'https://thepalacetheatre.ca/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
