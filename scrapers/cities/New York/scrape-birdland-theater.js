const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Birdland Theater events...');
  const scraper = createUniversalScraper(
    'Birdland Theater',
    'https://www.birdlandtheater.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
