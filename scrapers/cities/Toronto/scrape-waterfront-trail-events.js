const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Waterfront Trail events...');
  const scraper = createUniversalScraper(
    'Waterfront Trail',
    'https://www.blogto.com/events/',
    'Queens Quay, Toronto, ON M5J 2L3'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
