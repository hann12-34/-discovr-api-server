const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Intrepid Museum events...');
  const scraper = createUniversalScraper(
    'Intrepid Museum',
    'https://www.intrepidmuseum.org/events',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
