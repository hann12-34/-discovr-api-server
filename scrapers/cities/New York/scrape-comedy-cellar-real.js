const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Comedy Cellar events...');
  const scraper = createUniversalScraper(
    'Comedy Cellar',
    'https://www.comedycellar.com/',
    '117 MacDougal St, New York, NY 10012'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
