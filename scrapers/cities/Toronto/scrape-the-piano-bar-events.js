const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Piano Bar events...');
  const scraper = createUniversalScraper(
    'The Piano Bar',
    'https://www.blogto.com/events/',
    '2482 Yonge St, Toronto, ON M4P 2H5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
