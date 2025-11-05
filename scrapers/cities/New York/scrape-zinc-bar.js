const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Zinc Bar events...');
  const scraper = createUniversalScraper(
    'Zinc Bar',
    'https://zincbar.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
