const createUniversalScraper = require('./universal-scraper-template');

async function scrapeEvents(city = 'New York') {
  console.log('🎪 Scraping Shapeshifter Lab events...');
  const scraper = createUniversalScraper(
    'Shapeshifter Lab',
    'https://shapeshifterlab.com/',
    'New York, NY'
  );
  return await scraper(city);
}

module.exports = scrapeEvents;
