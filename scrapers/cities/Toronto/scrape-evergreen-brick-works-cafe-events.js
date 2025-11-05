const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Evergreen Brick Works Cafe events...');
  const scraper = createUniversalScraper(
    'Evergreen Brick Works Cafe',
    'https://www.blogto.com/eat_drink/',
    '550 Bayview Ave, Toronto, ON M4W 3X8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
