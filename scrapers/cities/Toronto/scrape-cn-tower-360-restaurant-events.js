const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Cn Tower 360 Restaurant events...');
  const scraper = createUniversalScraper(
    'Cn Tower 360 Restaurant',
    'https://www.blogto.com/eat_drink/',
    '290 Bremner Blvd, Toronto, ON M5V 3L9'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
