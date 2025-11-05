const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Apollo Theatre events...');
  const scraper = createUniversalScraper(
    'Apollo Theatre',
    'https://www.apollotheater.org/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
