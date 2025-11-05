const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Montreal') {
  console.log('🎪 Scraping Bar Le Ritz PDB events...');
  const scraper = createUniversalScraper(
    'Bar Le Ritz PDB',
    'https://www.barleritzpdb.com/',
    'Montreal'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
