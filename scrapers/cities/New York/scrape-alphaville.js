const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Alphaville events...');
  const scraper = createUniversalScraper(
    'Alphaville',
    'https://alphavillebrooklyn.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
