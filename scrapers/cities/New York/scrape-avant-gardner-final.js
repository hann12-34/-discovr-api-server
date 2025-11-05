const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Avant Gardner events...');
  const scraper = createUniversalScraper(
    'Avant Gardner',
    'https://avantgardner.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
