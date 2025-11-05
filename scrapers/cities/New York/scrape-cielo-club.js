const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Cielo Club events...');
  const scraper = createUniversalScraper(
    'Cielo Club',
    'https://www.cieloclub.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
