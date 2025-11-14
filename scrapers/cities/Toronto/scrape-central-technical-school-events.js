const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Central Technical School events...');
  const scraper = createUniversalScraper(
    'Central Technical School',
    'https://www.tdsb.on.ca',
    '603 Markham St, Toronto, ON M6G 2L7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
