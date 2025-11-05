const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bitter End events...');
  const scraper = createUniversalScraper(
    'Bitter End',
    'https://bitterend.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
