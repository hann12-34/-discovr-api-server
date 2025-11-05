const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping City Winery NYC events...');
  const scraper = createUniversalScraper(
    'City Winery NYC',
    'https://citywinery.com/newyork/Online/default.asp',
    '25 11th Ave, New York, NY 10011'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
