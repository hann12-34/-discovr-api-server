const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Mezzrow events...');
  const scraper = createUniversalScraper(
    'Mezzrow',
    'https://www.mezzrow.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
