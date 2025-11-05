const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Ucb Theatre events...');
  const scraper = createUniversalScraper(
    'Ucb Theatre',
    'https://ucbtheatre.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
