const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Brooklyn Museum events...');
  const scraper = createUniversalScraper(
    'Brooklyn Museum',
    'https://www.brooklynmuseum.org/exhibitions',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
