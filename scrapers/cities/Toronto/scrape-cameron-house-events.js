const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Cameron House events...');
  const scraper = createUniversalScraper(
    'Cameron House',
    'https://www.blogto.com/events/',
    '408 Queen St W, Toronto, ON M5V 2A7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
