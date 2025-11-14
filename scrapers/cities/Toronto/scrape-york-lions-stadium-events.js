const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping York Lions Stadium events...');
  const scraper = createUniversalScraper(
    'York Lions Stadium',
    'https://www.yorku.ca/lions/facilities/york-lions-stadium',
    '4700 Keele St, Toronto, ON M3J 1P3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
