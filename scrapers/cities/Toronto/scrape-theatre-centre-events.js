const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Theatre Centre events...');
  const scraper = createUniversalScraper(
    'Theatre Centre',
    'https://www.blogto.com/events/',
    '1115 Queen St W, Toronto, ON M6J 1J1'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
