const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Nublu events...');
  const scraper = createUniversalScraper(
    'Nublu',
    'https://www.nublu.net/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
