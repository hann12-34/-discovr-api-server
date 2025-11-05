const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Christie Pits events...');
  const scraper = createUniversalScraper(
    'Christie Pits',
    'https://www.blogto.com/events/',
    '750 Bloor St W, Toronto, ON M6G 1L4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
