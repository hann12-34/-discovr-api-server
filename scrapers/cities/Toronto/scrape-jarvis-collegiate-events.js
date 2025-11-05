const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Jarvis Collegiate events...');
  const scraper = createUniversalScraper(
    'Jarvis Collegiate',
    'https://www.blogto.com/events/',
    '495 Jarvis St, Toronto, ON M4Y 2H7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
