const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Air Canada Centre Alt events...');
  const scraper = createUniversalScraper(
    'Air Canada Centre Alt',
    'https://www.blogto.com/events/',
    '40 Bay St, Toronto, ON M5J 2X2'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
