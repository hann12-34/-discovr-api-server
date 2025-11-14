const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Harbord Collegiate events...');
  const scraper = createUniversalScraper(
    'Harbord Collegiate',
    'https://www.tdsb.on.ca',
    '286 Harbord St, Toronto, ON M6G 1G6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
