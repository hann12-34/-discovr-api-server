const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Lab events...');
  const scraper = createUniversalScraper(
    'The Lab',
    'https://www.blogto.com/events/',
    '672 Dupont St, Toronto, ON M6G 1Z6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
