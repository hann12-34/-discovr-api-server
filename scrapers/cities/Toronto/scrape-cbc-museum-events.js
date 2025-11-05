const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Cbc Museum events...');
  const scraper = createUniversalScraper(
    'Cbc Museum',
    'https://www.cbc.ca/museum/',
    '250 Front St W, Toronto, ON M5V 3G5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
