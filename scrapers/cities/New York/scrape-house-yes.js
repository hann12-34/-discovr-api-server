const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping House Yes events...');
  const scraper = createUniversalScraper(
    'House Yes',
    'https://houseofyes.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
