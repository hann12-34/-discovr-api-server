const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Guggenheim events...');
  const scraper = createUniversalScraper(
    'Guggenheim',
    'https://www.guggenheim.org/exhibitions',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
