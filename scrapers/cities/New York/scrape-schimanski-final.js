const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Schimanski events...');
  const scraper = createUniversalScraper(
    'Schimanski',
    'https://schimanskibrooklyn.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
