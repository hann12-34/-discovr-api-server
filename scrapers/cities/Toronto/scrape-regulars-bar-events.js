const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Regulars Bar events...');
  const scraper = createUniversalScraper(
    'Regulars Bar',
    'https://regularsbar.com/',
    '554 Dundas St W, Toronto, ON M5T 1H5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
