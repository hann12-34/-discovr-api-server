const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Spadina House events...');
  const scraper = createUniversalScraper(
    'Spadina House',
    'https://www.blogto.com/events/',
    '285 Spadina Rd, Toronto, ON M5R 2V5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
