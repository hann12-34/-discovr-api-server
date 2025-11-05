const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Motor Oil Records events...');
  const scraper = createUniversalScraper(
    'Motor Oil Records',
    'https://www.blogto.com/music/',
    '1098 Queen St W, Toronto, ON M6J 1H9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
