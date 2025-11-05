const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Pianos Bar events...');
  const scraper = createUniversalScraper(
    'Pianos Bar',
    'https://pianosnyc.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
