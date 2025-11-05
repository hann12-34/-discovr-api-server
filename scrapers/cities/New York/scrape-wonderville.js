const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Wonderville events...');
  const scraper = createUniversalScraper(
    'Wonderville',
    'https://www.wonderville.nyc/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
