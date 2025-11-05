const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Bata Shoe Museum events...');
  const scraper = createUniversalScraper(
    'Bata Shoe Museum',
    'https://batashoemuseum.ca/events/',
    '327 Bloor St W, Toronto, ON M5S 1W7'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
