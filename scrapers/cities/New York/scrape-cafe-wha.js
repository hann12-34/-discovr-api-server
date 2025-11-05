const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Cafe Wha events...');
  const scraper = createUniversalScraper(
    'Cafe Wha',
    'https://cafewha.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
