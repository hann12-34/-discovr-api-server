const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Harbourfront Centre events...');
  const scraper = createUniversalScraper(
    'Harbourfront Centre',
    'https://www.blogto.com/events/',
    '235 Queens Quay W, Toronto, ON M5J 2G8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
