const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Gallery 44 events...');
  const scraper = createUniversalScraper(
    'Gallery 44',
    'https://gallery44.org/exhibitions',
    '401 Richmond St W Suite 120, Toronto, ON M5V 3A8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
