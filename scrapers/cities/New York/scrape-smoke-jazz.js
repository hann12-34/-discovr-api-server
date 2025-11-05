const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Smoke Jazz events...');
  const scraper = createUniversalScraper(
    'Smoke Jazz',
    'https://www.smokejazz.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
