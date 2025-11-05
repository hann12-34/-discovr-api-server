const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Natural History Museum events...');
  const scraper = createUniversalScraper(
    'Natural History Museum',
    'https://www.amnh.org/calendar',
    'Central Park West, New York, NY 10024'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
