const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Whitney Museum events...');
  const scraper = createUniversalScraper(
    'Whitney Museum',
    'https://whitney.org/exhibitions',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
