const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Place des Arts events...');
  const scraper = createUniversalScraper(
    'Place des Arts',
    'https://placedesarts.com/en/events',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
