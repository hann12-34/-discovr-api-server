const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Market Hotel events...');
  const scraper = createUniversalScraper(
    'Market Hotel',
    'https://www.market-hotel.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
