const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Eastern Commerce Collegiate events...');
  const scraper = createUniversalScraper(
    'Eastern Commerce Collegiate',
    'https://www.blogto.com/events/',
    '230 Oak Park Ave, East York, ON M4C 4N9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
