const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Sonic Boom Records events...');
  const scraper = createUniversalScraper(
    'Sonic Boom Records',
    'https://www.blogto.com/events/',
    '215 Spadina Ave, Toronto, ON M5T 2C7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
