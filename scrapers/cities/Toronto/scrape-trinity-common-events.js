const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Trinity Common events...');
  const scraper = createUniversalScraper(
    'Trinity Common',
    'https://trinitycommon.ca/',
    '60 Atlantic Ave, Toronto, ON M6K 1X9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
