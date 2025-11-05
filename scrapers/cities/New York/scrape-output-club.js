const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Output Club events...');
  const scraper = createUniversalScraper(
    'Output Club',
    'https://outputclub.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
