const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Lamport Stadium events...');
  const scraper = createUniversalScraper(
    'Lamport Stadium',
    'https://www.blogto.com/events/',
    '1155 King St W, Toronto, ON M6K 3C5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
