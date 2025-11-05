const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping NYC Fashion Week events...');
  const scraper = createUniversalScraper(
    'NYC Fashion Week',
    'https://nyfw.com',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
