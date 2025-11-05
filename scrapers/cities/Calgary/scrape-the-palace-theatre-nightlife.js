const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Calgary') {
  console.log('🎪 Scraping The Palace Theatre events...');
  const scraper = createUniversalScraper(
    'The Palace Theatre',
    'https://thepalacetheatre.ca/events/',
    'Calgary'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
