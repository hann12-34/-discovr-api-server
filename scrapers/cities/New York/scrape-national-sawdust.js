const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping National Sawdust events...');
  const scraper = createUniversalScraper(
    'National Sawdust',
    'https://nationalsawdust.org/events/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
