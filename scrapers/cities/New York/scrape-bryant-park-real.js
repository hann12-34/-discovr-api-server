const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bryant Park events...');
  const scraper = createUniversalScraper(
    'Bryant Park',
    'https://bryantpark.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
