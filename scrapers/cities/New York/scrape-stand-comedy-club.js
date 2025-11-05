const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Stand Comedy Club events...');
  const scraper = createUniversalScraper(
    'Stand Comedy Club',
    'https://thestandnyc.com/calendar/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
