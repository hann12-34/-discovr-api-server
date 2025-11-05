const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bryant Park events...');
  const scraper = createUniversalScraper(
    'Bryant Park',
    'https://bryantpark.org/events',
    'New York, NY 10018'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
