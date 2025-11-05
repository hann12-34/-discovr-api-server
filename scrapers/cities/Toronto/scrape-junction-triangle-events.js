const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Junction Triangle events...');
  const scraper = createUniversalScraper(
    'Junction Triangle',
    'https://www.blogto.com/music/',
    '2020 Dundas St W, Toronto, ON M6R 1W6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
