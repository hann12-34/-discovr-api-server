const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Bar Next Door events...');
  const scraper = createUniversalScraper(
    'Bar Next Door',
    'https://www.lalanternacaffe.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
