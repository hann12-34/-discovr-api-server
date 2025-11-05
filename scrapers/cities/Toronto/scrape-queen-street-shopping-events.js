const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Queen Street West events...');
  const scraper = createUniversalScraper(
    'Queen Street West',
    'https://www.blogto.com/music/',
    'Queen St W, Toronto, ON'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
