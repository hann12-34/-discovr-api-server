const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Eventbrite Toronto events...');
  const scraper = createUniversalScraper(
    'Eventbrite Toronto',
    'https://www.blogto.com/arts/',
    '355 King St W, Toronto, ON M5V 1J6'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
