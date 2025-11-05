const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Four Seasons Centre events...');
  const scraper = createUniversalScraper(
    'Four Seasons Centre',
    'https://nowtoronto.com/music',
    '145 Queen St W, Toronto, ON M5H 4G1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
