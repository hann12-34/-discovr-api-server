const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Staten Island Yankees events...');
  const scraper = createUniversalScraper(
    'Staten Island Yankees',
    'https://www.siferryhawks.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
