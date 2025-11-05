const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'Toronto') {
  console.log('🎪 Scraping Coronation Park events...');
  const scraper = createUniversalScraper(
    'Coronation Park',
    'https://nowtoronto.com/stage',
    '711 Lake Shore Blvd W, Toronto, ON M5V 2Z5'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
