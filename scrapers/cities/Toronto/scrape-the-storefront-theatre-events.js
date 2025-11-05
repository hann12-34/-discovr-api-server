const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping The Storefront Theatre events...');
  const scraper = createUniversalScraper(
    'The Storefront Theatre',
    'https://www.blogto.com/events/',
    '955 Bloor St W, Toronto, ON M6H 1L7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
