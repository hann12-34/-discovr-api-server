const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping The Creek events...');
  const scraper = createUniversalScraper(
    'The Creek',
    'https://www.thecreeklic.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
