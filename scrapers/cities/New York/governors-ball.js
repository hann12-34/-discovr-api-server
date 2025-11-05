const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Governors Ball events...');
  const scraper = createUniversalScraper(
    'Governors Ball',
    'https://www.governorsballmusicfestival.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
