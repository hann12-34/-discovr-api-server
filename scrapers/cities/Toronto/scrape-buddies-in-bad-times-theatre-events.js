const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Buddies In Bad Times Theatre events...');
  const scraper = createUniversalScraper(
    'Buddies In Bad Times Theatre',
    'https://www.blogto.com/events/',
    '12 Alexander St, Toronto, ON M4Y 1B4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
