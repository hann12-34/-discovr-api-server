const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bowery Electric events...');
  const scraper = createUniversalScraper(
    'Bowery Electric',
    'https://www.theboweryelectric.com',
    '327 Bowery, New York, NY 10003'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
