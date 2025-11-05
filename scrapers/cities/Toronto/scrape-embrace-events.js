const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Embrace events...');
  const scraper = createUniversalScraper(
    'Embrace',
    'https://www.blogto.com/events/',
    '159 Augusta Ave, Toronto, ON M5T 2L4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
