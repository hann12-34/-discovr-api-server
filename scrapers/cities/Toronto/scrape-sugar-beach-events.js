const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Sugar Beach events...');
  const scraper = createUniversalScraper(
    'Sugar Beach',
    'https://factorytheatre.ca/',
    '11 Dockside Dr, Toronto, ON M5A 0B5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
