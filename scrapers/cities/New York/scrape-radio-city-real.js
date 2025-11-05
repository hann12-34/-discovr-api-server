const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Radio City events...');
  const scraper = createUniversalScraper(
    'Radio City',
    'https://www.msg.com/radio-city-music-hall',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
