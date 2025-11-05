const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Ghost River Theatre events...');
  const scraper = createUniversalScraper(
    'Ghost River Theatre',
    'https://www.blogto.com/events/',
    '368 Dufferin St Unit 203, Toronto, ON M6K 1Z8'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
