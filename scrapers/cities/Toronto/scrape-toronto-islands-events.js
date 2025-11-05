const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Toronto Islands events...');
  const scraper = createUniversalScraper(
    'Toronto Islands',
    'https://www.blogto.com/events/',
    'Toronto Island Park, Toronto, ON M5J 2E4'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
