const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping LiveNation NYC events...');
  const scraper = createUniversalScraper(
    'LiveNation NYC',
    'https://www.livenation.com/city/new-york-ny/12766',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
