const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Baby Grand events...');
  const scraper = createUniversalScraper(
    'Baby Grand',
    'https://www.babygrandnyc.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
