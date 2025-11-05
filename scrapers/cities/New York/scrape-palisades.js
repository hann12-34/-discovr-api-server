const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Palisades events...');
  const scraper = createUniversalScraper(
    'Palisades',
    'https://www.palisadesbrooklyn.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
