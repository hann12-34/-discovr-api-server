const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Metropolitan Museum events...');
  const scraper = createUniversalScraper(
    'Metropolitan Museum',
    'https://www.metmuseum.org/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
